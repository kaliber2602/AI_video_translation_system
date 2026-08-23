import { useState, useRef, useEffect, useCallback } from "react";

export interface ElasticDragOptions {
  /** Resistance coefficient for rubber-band effect (0.1 to 0.9, default 0.42) */
  elasticity?: number;
  /** Maximum drag displacement in pixels (default 160) */
  maxDisplacement?: number;
  /** Tilt angle factor per px dragged (default 0.035) */
  tiltFactor?: number;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: (offset: { x: number; y: number }) => void;
  /** Disable drag */
  disabled?: boolean;
}

export function useElasticDrag<T extends HTMLElement = HTMLElement>({
  elasticity = 0.42,
  maxDisplacement = 160,
  tiltFactor = 0.035,
  onDragStart,
  onDragEnd,
  disabled = false,
}: ElasticDragOptions = {}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const elementRef = useRef<T | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const animFrameId = useRef<number | null>(null);
  const velocity = useRef({ x: 0, y: 0 });
  const lastTime = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);

  // Rubber-band resistance formula (Apple iOS physics)
  const applyRubberBand = useCallback(
    (delta: number) => {
      const absDelta = Math.abs(delta);
      const sign = Math.sign(delta);
      const resisted =
        (absDelta * elasticity * maxDisplacement) /
        (maxDisplacement + absDelta * elasticity);
      return sign * Math.min(resisted, maxDisplacement);
    },
    [elasticity, maxDisplacement]
  );

  // Spring physics simulation back to 0,0 on release (Damped harmonic oscillator)
  const startSpringAnimation = useCallback(() => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
    }

    const stiffness = 280; // Spring stiffness
    const damping = 22; // Spring damping
    const mass = 1;

    let posX = currentOffset.current.x;
    let posY = currentOffset.current.y;
    let velX = velocity.current.x * 0.45;
    let velY = velocity.current.y * 0.45;
    let lastAnimTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastAnimTime) / 1000, 0.032);
      lastAnimTime = now;

      // Spring formula: F = -k*x - c*v
      const forceX = -stiffness * posX - damping * velX;
      const forceY = -stiffness * posY - damping * velY;

      const accX = forceX / mass;
      const accY = forceY / mass;

      velX += accX * dt;
      velY += accY * dt;

      posX += velX * dt;
      posY += velY * dt;

      currentOffset.current = { x: posX, y: posY };
      setOffset({ x: posX, y: posY });

      // Stop condition: both displacement and velocity are near zero
      if (
        Math.abs(posX) < 0.1 &&
        Math.abs(posY) < 0.1 &&
        Math.abs(velX) < 0.1 &&
        Math.abs(velY) < 0.1
      ) {
        currentOffset.current = { x: 0, y: 0 };
        setOffset({ x: 0, y: 0 });
        animFrameId.current = null;
        return;
      }

      animFrameId.current = requestAnimationFrame(animate);
    };

    animFrameId.current = requestAnimationFrame(animate);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<T>) => {
      if (disabled || e.button !== 0) return;

      const target = e.target as HTMLElement;
      // Do not initiate card drag if clicking on interactive controls inside the card
      const interactive = target.closest(
        "button, a, input, textarea, select, [data-no-drag], [role='menuitem']"
      );
      if (interactive && interactive !== e.currentTarget) {
        return;
      }

      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }

      startPos.current = { x: e.clientX, y: e.clientY };
      lastTime.current = performance.now();
      velocity.current = { x: 0, y: 0 };
      hasDraggedRef.current = false;

      const handleGlobalPointerMove = (moveEvent: PointerEvent) => {
        const rawDeltaX = moveEvent.clientX - startPos.current.x;
        const rawDeltaY = moveEvent.clientY - startPos.current.y;

        if (Math.abs(rawDeltaX) > 3 || Math.abs(rawDeltaY) > 3) {
          if (!hasDraggedRef.current) {
            hasDraggedRef.current = true;
            setIsDragging(true);
            onDragStart?.();
          }
        }

        const now = performance.now();
        const dt = Math.max((now - lastTime.current) / 1000, 0.001);
        lastTime.current = now;

        const resistedX = applyRubberBand(rawDeltaX);
        const resistedY = applyRubberBand(rawDeltaY);

        velocity.current = {
          x: (resistedX - currentOffset.current.x) / dt,
          y: (resistedY - currentOffset.current.y) / dt,
        };

        currentOffset.current = { x: resistedX, y: resistedY };
        setOffset({ x: resistedX, y: resistedY });
      };

      const handleGlobalPointerUp = () => {
        window.removeEventListener("pointermove", handleGlobalPointerMove);
        window.removeEventListener("pointerup", handleGlobalPointerUp);
        window.removeEventListener("pointercancel", handleGlobalPointerUp);

        setIsDragging(false);
        onDragEnd?.(currentOffset.current);
        startSpringAnimation();
      };

      window.addEventListener("pointermove", handleGlobalPointerMove, {
        passive: true,
      });
      window.addEventListener("pointerup", handleGlobalPointerUp);
      window.addEventListener("pointercancel", handleGlobalPointerUp);
    },
    [disabled, onDragStart, onDragEnd, applyRubberBand, startSpringAnimation]
  );

  useEffect(() => {
    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, []);

  const tilt = offset.x * tiltFactor;
  const scale = isDragging ? 1.04 : 1;

  const dragStyle: React.CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${tilt}deg) scale(${scale})`,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
    willChange: "transform",
    transition: isDragging
      ? "none"
      : "box-shadow 0.25s ease-out, border-color 0.2s ease-out",
  };

  return {
    handlePointerDown,
    dragStyle,
    offset,
    isDragging,
    hasDraggedRef,
    elementRef,
  };
}
