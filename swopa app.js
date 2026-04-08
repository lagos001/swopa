import React, { useState, useRef, useCallback, useEffect } from 'react';

const FLY_DISTANCE = 520;
const SWIPE_FLING_MS = 190;
const PHOTO_CARD_BG = '#ece0d1';
const PHOTO_CARD_RADIUS = 20;
const TAP_SLOP_PX = 22;
const TAP_MAX_MS = 550;

const PRODUCTS = [
  {
    id: 'poleron',
    label: 'Poleron',
    images: [
      './poleron 1.webp',
      './poleron 2.webp',
      './poleron 3.webp',
      './poleron 4.webp',
      './poleron 5.webp',
    ],
  },
  {
    id: 'poleran',
    label: 'Poleran',
    images: [
      './poleran 1.webp',
      './poleran 2.webp',
      './poleran 3.webp',
      './poleran 4.webp',
    ],
  },
];

const LOGO_SRC = './logo.png';
const BRAND_WORDMARK_COLOR = '#634832';
const brandFont = "'Outfit', system-ui, -apple-system, sans-serif";

function IconX({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-6.716-4.35-9-8.5C.5 8.5 2.5 5 6.5 5c1.928 0 3.648 1.012 4.5 2.428C11.852 6.012 13.572 5 15.5 5c4 0 6 3.5 4.5 7.5C17.716 16.65 12 21 12 21z" />
    </svg>
  );
}

function IconSettingsSliders({ size = 26, color = '#121212' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="3" y1="7" x2="21" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="7" r="2.5" fill={color} />
      <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="12" r="2.5" fill={color} />
      <line x1="3" y1="17" x2="21" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="17" r="2.5" fill={color} />
    </svg>
  );
}

function SwipeRopaApp() {
  useEffect(() => {
    const id = 'swopa-font-outfit';
    if (typeof document !== 'undefined' && !document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const [productIndex, setProductIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(null);
  const [layoutInstant, setLayoutInstant] = useState(false);
  const startClientX = useRef(0);
  const startPointer = useRef({ x: 0, y: 0, t: 0 });
  const pointerActive = useRef(false);
  const activePointerId = useRef(null);
  const cardRef = useRef(null);
  const maxDistFromStart = useRef(0);

  const onLostPointerCaptureNative = useCallback((ev) => {
    if (ev.pointerId !== activePointerId.current) return;
    pointerActive.current = false;
    activePointerId.current = null;
    setDragging(false);
    setDragX(0);
  }, []);

  const setCardRef = useCallback(
    (node) => {
      const prev = cardRef.current;
      if (prev) {
        prev.removeEventListener('lostpointercapture', onLostPointerCaptureNative);
      }
      cardRef.current = node;
      if (node) {
        node.addEventListener('lostpointercapture', onLostPointerCaptureNative);
      }
    },
    [onLostPointerCaptureNative]
  );

  useEffect(() => {
    setPhotoIndex(0);
  }, [productIndex]);

  const finishSwipe = useCallback((direction) => {
    const fly = direction === 'right' ? FLY_DISTANCE : -FLY_DISTANCE;
    setExiting(direction);
    setDragX(fly);
    setTimeout(() => {
      setLayoutInstant(true);
      setDragX(0);
      setExiting(null);
      setPhotoIndex(0);
      setProductIndex((i) => (i + 1) % PRODUCTS.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLayoutInstant(false);
        });
      });
    }, SWIPE_FLING_MS);
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      if (exiting) return;
      if (pointerActive.current) {
        pointerActive.current = false;
        activePointerId.current = null;
        setDragging(false);
        setDragX(0);
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
      activePointerId.current = e.pointerId;
      pointerActive.current = true;
      const x = e.clientX;
      const y = e.clientY;
      startClientX.current = x;
      startPointer.current = { x, y, t: Date.now() };
      maxDistFromStart.current = 0;
      setDragging(true);
      setDragX(0);
    },
    [exiting]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!pointerActive.current || exiting) return;
      if (e.pointerId !== activePointerId.current) return;
      const sp = startPointer.current;
      const d = Math.hypot(e.clientX - sp.x, e.clientY - sp.y);
      maxDistFromStart.current = Math.max(maxDistFromStart.current, d);
      setDragX(e.clientX - startClientX.current);
    },
    [exiting]
  );

  const onPointerUp = useCallback(
    (e) => {
      if (!pointerActive.current || exiting) return;
      if (e.pointerId !== activePointerId.current) return;
      pointerActive.current = false;
      activePointerId.current = null;
      try {
        const el = e.currentTarget;
        if (el.releasePointerCapture && typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}

      const sp = startPointer.current;
      const dx = e.clientX - sp.x;
      const dy = e.clientY - sp.y;
      const finalDist = Math.hypot(dx, dy);
      const peakDist = Math.max(maxDistFromStart.current, finalDist);
      const elapsed = Date.now() - sp.t;
      const isTap = peakDist <= TAP_SLOP_PX && elapsed < TAP_MAX_MS;

      if (isTap) {
        setDragging(false);
        const el = cardRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const tapX = e.clientX - rect.left;
          const mid = rect.width / 2;
          if (tapX < mid) {
            setPhotoIndex((i) => Math.max(0, i - 1));
          } else {
            const len = PRODUCTS[productIndex].images.length;
            setPhotoIndex((i) => Math.min(len - 1, i + 1));
          }
        }
        setDragX(0);
        return;
      }

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > TAP_SLOP_PX && absDx >= absDy) {
        finishSwipe(dx > 0 ? 'right' : 'left');
        setDragging(false);
      } else {
        setDragging(false);
        setDragX(0);
      }
    },
    [exiting, finishSwipe, productIndex]
  );

  const onPointerCancel = useCallback((e) => {
    if (!e || e.pointerId == null) return;
    if (e.pointerId !== activePointerId.current) return;
    pointerActive.current = false;
    activePointerId.current = null;
    setDragging(false);
    if (!exiting) setDragX(0);
  }, [exiting]);

  const rotate = dragging || exiting ? dragX * 0.06 : 0;
  const transition =
    dragging || layoutInstant
      ? 'none'
      : exiting
        ? `transform ${SWIPE_FLING_MS}ms linear`
        : 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  const likeOpacity = Math.min(1, Math.max(0, (dragX - 30) / 100));
  const nopeOpacity = Math.min(1, Math.max(0, (-dragX - 30) / 100));

  const nextProductIndex = (productIndex + 1) % PRODUCTS.length;
  const nextProduct = PRODUCTS[nextProductIndex];

  const btnReject = {
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: 'none',
    background: '#ff3040',
    color: '#fff',
    cursor: 'pointer',
    marginRight: 48,
    transition: 'transform 0.15s ease',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  };
  const btnLike = {
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: 'none',
    background: '#22c55e',
    color: '#fff',
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  };

  const PHOTO_SIDE_MARGIN = 56;
  const FOOTER_BAR_HEIGHT = 123;
  const LOGO_IMG_HEIGHT = 58;
  const barTop = {
    flexShrink: 0,
    width: '100%',
    height: 78,
    minHeight: 78,
    background: '#ece0d1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
  };
  const barBottom = {
    flexShrink: 0,
    width: '100%',
    height: FOOTER_BAR_HEIGHT,
    minHeight: FOOTER_BAR_HEIGHT,
    background: '#ece0d1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  };
  const mainArea = {
    flex: 1,
    width: '100%',
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: '#ece0d1',
  };
  const photoFill = {
    flex: 1,
    position: 'relative',
    width: '100%',
    minHeight: 0,
    padding: `16px ${PHOTO_SIDE_MARGIN}px`,
    boxSizing: 'border-box',
  };
  const photoCard = {
    position: 'relative',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    borderRadius: PHOTO_CARD_RADIUS,
    overflow: 'hidden',
    background: PHOTO_CARD_BG,
    border: 'none',
    boxShadow:
      '0 12px 32px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.12), 0 2px 0 rgba(255,255,255,0.35) inset, inset 0 0 0 0.25px #121212',
  };
  const photoImageClip = {
    width: '100%',
    height: '100%',
    minHeight: 0,
    borderRadius: PHOTO_CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: PHOTO_CARD_BG,
    isolation: 'isolate',
    WebkitMaskImage: '-webkit-radial-gradient(white, white)',
    maskImage: 'radial-gradient(white, white)',
  };
  const contentShell = {
    flex: 1,
    width: '100%',
    minHeight: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  };
  const actionsOverlay = {
    position: 'absolute',
    left: PHOTO_SIDE_MARGIN,
    right: PHOTO_SIDE_MARGIN,
    bottom: FOOTER_BAR_HEIGHT,
    transform: 'translateY(50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    pointerEvents: 'auto',
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#ece0d1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        overflow: 'hidden',
      }}
    >
      <header style={barTop}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
          role="img"
          aria-label="Swopa"
        >
          <img
            src={LOGO_SRC}
            alt=""
            style={{
              height: LOGO_IMG_HEIGHT,
              width: 'auto',
              maxWidth: 200,
              objectFit: 'contain',
              display: 'block',
              borderRadius: 14,
            }}
          />
          <span
            style={{
              fontFamily: brandFont,
              fontWeight: 600,
              fontSize: LOGO_IMG_HEIGHT,
              color: BRAND_WORDMARK_COLOR,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              height: LOGO_IMG_HEIGHT,
            }}
          >
            swopa
          </span>
        </div>
        <span
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}
          role="img"
          aria-label="Ajustes"
          title="Ajustes"
        >
          <IconSettingsSliders size={28} color="#121212" />
        </span>
      </header>

      <div style={contentShell}>
        <div style={mainArea}>
          <div style={photoFill}>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            >
              <div style={photoCard}>
                <div style={photoImageClip}>
                  <img
                    key={`under-${nextProductIndex}-${productIndex}`}
                    src={nextProduct.images[0]}
                    alt=""
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      backgroundColor: PHOTO_CARD_BG,
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              key={productIndex}
              ref={setCardRef}
              role="presentation"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                touchAction: 'none',
                cursor: dragging ? 'grabbing' : 'grab',
                transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
                transition,
                willChange: 'transform',
              }}
            >
              <div style={photoCard}>
                <div style={photoImageClip}>
                  <img
                    key={`${productIndex}-${photoIndex}`}
                    src={PRODUCTS[productIndex].images[photoIndex]}
                    alt={`${PRODUCTS[productIndex].label} ${photoIndex + 1}`}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      backgroundColor: PHOTO_CARD_BG,
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      padding: '12px 26px',
                      border: 'none',
                      borderRadius: 14,
                      color: '#fff',
                      fontSize: 42,
                      fontWeight: 800,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      opacity: nopeOpacity,
                      transform: 'rotate(-14deg) scale(1.05)',
                      background: '#ff3040',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    nope
                  </span>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      padding: '12px 26px',
                      border: 'none',
                      borderRadius: 14,
                      color: '#fff',
                      fontSize: 42,
                      fontWeight: 800,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      opacity: likeOpacity,
                      transform: 'rotate(14deg) scale(1.05)',
                      background: '#22c55e',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    like
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer style={{ ...barBottom, position: 'relative', zIndex: 1 }} aria-hidden="true">
          <span style={{ width: 28, height: 4, borderRadius: 2, background: 'rgba(99,72,50,0.22)' }} />
          <span style={{ width: 28, height: 4, borderRadius: 2, background: 'rgba(99,72,50,0.15)' }} />
          <span style={{ width: 28, height: 4, borderRadius: 2, background: 'rgba(99,72,50,0.15)' }} />
        </footer>

        <div style={actionsOverlay}>
          <button
            type="button"
            style={btnReject}
            disabled={!!exiting}
            onClick={() => finishSwipe('left')}
            aria-label="Rechazar"
          >
            <IconX size={40} />
          </button>
          <button
            type="button"
            style={btnLike}
            disabled={!!exiting}
            onClick={() => finishSwipe('right')}
            aria-label="Me gusta"
          >
            <IconHeart size={38} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SwipeRopaApp;
