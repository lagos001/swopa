import argparse
import html
import json
import random
import re
import time
from pathlib import Path
from typing import Any

import requests


DEFAULT_CATEGORY_URL = "https://www.americanino.cl/americanino-cl/category/cat20002/Moda-Mujer"
DEFAULT_DELAY = 1.4
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36"
NEXT_DATA_PATTERN = re.compile(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>')


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"-{2,}", "-", slug)


def price_to_int(value: str | None) -> int | None:
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    return int(digits) if digits else None


def first_sentence(text: str) -> str:
    clean = " ".join((text or "").split()).strip()
    if not clean:
        return ""
    match = re.split(r"(?<=[.!?])\s+", clean, maxsplit=1)
    sentence = match[0]
    return sentence if len(sentence) <= 150 else f"{sentence[:147].rstrip()}..."


def clean_text(text: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", text or "")
    unescaped = html.unescape(without_tags)
    return " ".join(unescaped.split()).strip()


def parse_next_data(html: str) -> dict[str, Any]:
    match = NEXT_DATA_PATTERN.search(html)
    if not match:
        raise ValueError("No se encontró __NEXT_DATA__ en la respuesta.")
    return json.loads(match.group(1))


def request_json_payload(session: requests.Session, url: str) -> dict[str, Any]:
    response = session.get(url, timeout=45)
    response.raise_for_status()
    return parse_next_data(response.text)


def sleep_between(delay: float) -> None:
    time.sleep(delay + random.uniform(0.05, 0.3))


def listing_price(prices: list[dict[str, Any]], kind: str) -> int | None:
    for price in prices or []:
        if price.get("type") == kind:
            amount = price.get("price") or []
            if amount:
                return price_to_int(amount[0])
    return None


def collect_listing_records(session: requests.Session, category_url: str, delay: float) -> list[dict[str, Any]]:
    first_payload = request_json_payload(session, category_url)
    page_props = first_payload["props"]["pageProps"]
    pagination = page_props["pagination"]
    per_page = pagination["perPage"] or len(page_props["results"]) or 48
    total = pagination["count"]
    total_pages = max(1, (total + per_page - 1) // per_page)

    records_by_id: dict[str, dict[str, Any]] = {}

    for page_number in range(1, total_pages + 1):
        page_url = category_url if page_number == 1 else f"{category_url}?page={page_number}"
        payload = first_payload if page_number == 1 else request_json_payload(session, page_url)
        results = payload["props"]["pageProps"]["results"]
        print(f"[list] página {page_number}/{total_pages}: {len(results)} resultados")

        for item in results:
            product_id = item["productId"]
            size_variant = next(
                (
                    option
                    for variant in item.get("variants", [])
                    if variant.get("type") == "SIZES"
                    for option in variant.get("options", [])
                    if option.get("available")
                ),
                None,
            )
            detail_url = size_variant.get("url") if size_variant else item.get("url")
            records_by_id[product_id] = {
                "product_id": product_id,
                "display_name": item.get("displayName", "").strip(),
                "brand": item.get("brand", "").strip(),
                "detail_url": detail_url,
                "listing_url": item.get("url"),
                "seller_name": item.get("sellerName", "").strip() or "Falabella",
                "merchant_category_id": item.get("merchantCategoryId"),
                "prices": {
                    "current": listing_price(item.get("prices", []), "internetPrice"),
                    "normal": listing_price(item.get("prices", []), "normalPrice"),
                },
                "media_urls": item.get("mediaUrls", []),
                "rating": item.get("rating"),
                "review_count": item.get("totalReviews"),
                "discount_label": (item.get("discountBadge") or {}).get("label"),
                "badges": [badge.get("label") for badge in item.get("badges", []) if badge.get("label")],
            }

        if page_number < total_pages:
            sleep_between(delay)

    return list(records_by_id.values())


def normalize_specifications(specs: list[dict[str, Any]]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for spec in specs or []:
        name = (spec.get("name") or "").strip()
        value = (spec.get("value") or "").strip()
        if name and value:
            normalized[name] = value
    return normalized


def infer_category(name: str, product_type: str, specs: dict[str, str], breadcrumbs: list[dict[str, Any]]) -> str:
    haystack = " ".join(
        [
            name,
            product_type,
            specs.get("Tipo", ""),
            specs.get("Material de vestuario", ""),
            " ".join(item.get("label", "") for item in breadcrumbs or []),
        ]
    ).lower()

    keyword_groups = [
        ("swimwear", ["bikini", "traje de baño", "swim", "baño", "cover up", "cover-up", "playa"]),
        ("underwear-pajamas", ["pijama", "sleep", "bralette", "bata", "ropa interior", "homewear"]),
        ("shoes", ["zapatilla", "sandalia", "bota", "botin", "calzado", "ballerina"]),
        ("accessories", ["cartera", "mochila", "bolso", "cinturon", "billetera", "accesorio", "lentes", "anteojos", "collar"]),
        ("bottoms", ["jeans", "pantalon", "falda", "short", "bottom", "wide leg", "skinny", "cargo", "tiro"]),
    ]
    for category, keywords in keyword_groups:
        if any(keyword in haystack for keyword in keywords):
            return category
    return "tops"


def build_badge(record: dict[str, Any], specs: dict[str, str]) -> str:
    if record.get("discount_label"):
        return record["discount_label"]
    badges = record.get("badges") or []
    if badges:
        return badges[0]
    type_label = specs.get("Tipo")
    if type_label:
        return type_label
    return "Americanino"


def build_materials(specs: dict[str, str], top_specs: list[dict[str, Any]]) -> list[str]:
    material_fields = [
        specs.get("Composición"),
        specs.get("Material de vestuario"),
        specs.get("Material"),
    ]
    materials = [value for value in material_fields if value]
    for spec in top_specs or []:
        value = (spec.get("value") or "").strip()
        if value and value not in materials:
            materials.append(value)
    return materials[:4] or ["Material no informado"]


def build_details(specs: dict[str, str]) -> list[str]:
    excluded = {
        "Condicion del producto",
        "Género",
        "Material de vestuario",
        "Tipo",
        "País de origen",
        "Modelo",
        "Composición",
    }
    details = [f"{key}: {value}" for key, value in specs.items() if key not in excluded]
    return details[:6]


def extract_detail_record(session: requests.Session, listing_record: dict[str, Any], delay: float) -> dict[str, Any]:
    payload = request_json_payload(session, listing_record["detail_url"])
    product_data = payload["props"]["pageProps"]["productData"]
    attributes = product_data.get("attributes", {})
    specs = normalize_specifications(attributes.get("specifications", []))
    top_specs = attributes.get("topSpecifications", [])

    images: list[str] = []
    current_variant_id = product_data.get("currentVariant")
    variants = product_data.get("variants", [])
    available_sizes = []
    available_colors = []

    current_price = None
    original_price = None
    chosen_variant = None

    for variant in variants:
        if variant.get("id") == current_variant_id:
            chosen_variant = variant
        size = (variant.get("attributes") or {}).get("size")
        color_name = (variant.get("attributes") or {}).get("colorName")
        if size and size not in available_sizes:
            available_sizes.append(size)
        if color_name and color_name not in available_colors:
            available_colors.append(color_name)

    for media in product_data.get("medias", []):
        url = media.get("url")
        if media.get("mediaType") == "image" and url and "NoImage" not in url:
            images.append(url)
    for media in (chosen_variant or {}).get("medias", []):
        url = media.get("url")
        if media.get("mediaType") == "image" and url and "NoImage" not in url:
            images.append(url)
    for url in listing_record.get("media_urls", []):
        if url and "NoImage" not in url:
            images.append(url)
    images = list(dict.fromkeys(images))

    variant_prices = (chosen_variant or {}).get("prices") or []
    current_price = listing_price(variant_prices, "internetPrice") or listing_record["prices"]["current"]
    original_price = listing_price(variant_prices, "normalPrice") or listing_record["prices"]["normal"]

    category = infer_category(
        product_data.get("name", listing_record["display_name"]),
        product_data.get("productType", ""),
        specs,
        product_data.get("breadCrumb", []),
    )

    clean_description = clean_text(product_data.get("description") or "")
    clean_long_description = clean_text(product_data.get("longDescription") or product_data.get("description") or "")

    result = {
        "id": f"americanino-{listing_record['product_id']}",
        "externalId": listing_record["product_id"],
        "name": product_data.get("name", listing_record["display_name"]),
        "brand": product_data.get("brandName", listing_record["brand"]),
        "source": listing_record.get("seller_name") or "Falabella",
        "sourceStore": "Americanino",
        "category": category,
        "price": current_price,
        "originalPrice": original_price,
        "currency": "CLP",
        "images": images,
        "shortDescription": first_sentence(clean_description or clean_long_description or product_data.get("name")),
        "longDescription": clean_long_description,
        "materials": build_materials(specs, top_specs),
        "details": build_details(specs),
        "availableSizes": available_sizes or ["One size"],
        "availableColors": available_colors,
        "sourceUrl": listing_record["detail_url"],
        "productUrl": listing_record["detail_url"],
        "modelCode": specs.get("Modelo", ""),
        "fit": specs.get("Calce", specs.get("Fit", "")),
        "origin": specs.get("País de origen", ""),
        "mood": specs.get("Tipo", ""),
        "badge": build_badge(listing_record, specs),
        "highlights": [value for value in [specs.get("Tipo"), specs.get("Material de vestuario"), specs.get("País de origen")] if value][:3],
        "metadata": {
            "merchantCategoryId": listing_record.get("merchant_category_id"),
            "productType": product_data.get("productType"),
            "brandId": product_data.get("brandId"),
            "primaryVariantId": product_data.get("primaryVariantId"),
            "currentVariant": current_variant_id,
            "specifications": specs,
            "breadcrumbs": product_data.get("breadCrumb", []),
            "rating": listing_record.get("rating"),
            "reviewCount": listing_record.get("review_count"),
            "discountLabel": listing_record.get("discount_label"),
        },
    }

    sleep_between(delay)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrapea el catálogo de moda mujer de Americanino a JSON.")
    parser.add_argument("--category-url", default=DEFAULT_CATEGORY_URL)
    parser.add_argument("--output", default="data/americanino_women_app.json")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    parser.add_argument("--limit", type=int, default=0, help="Máximo de productos a procesar. 0 = todos.")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
    )

    print(f"[start] category: {args.category_url}")
    listing_records = collect_listing_records(session, args.category_url, args.delay)
    if args.limit:
        listing_records = listing_records[:args.limit]
    print(f"[list] productos únicos: {len(listing_records)}")

    catalog = []
    failures = []
    for index, record in enumerate(listing_records, start=1):
        try:
            print(f"[detail] {index}/{len(listing_records)} {record['display_name']}")
            catalog.append(extract_detail_record(session, record, args.delay))
        except Exception as error:  # noqa: BLE001
            failures.append({"productId": record["product_id"], "url": record["detail_url"], "error": str(error)})
            print(f"[warn] falló {record['product_id']}: {error}")

    output = {
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "Americanino",
        "categoryUrl": args.category_url,
        "count": len(catalog),
        "failures": failures,
        "products": catalog,
    }
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] guardado en {output_path} ({len(catalog)} productos, {len(failures)} fallos)")


if __name__ == "__main__":
    main()
