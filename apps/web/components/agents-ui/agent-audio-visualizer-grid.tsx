'use client';

import React, {
  type CSSProperties,
  Children,
  type ComponentProps,
  type ReactNode,
  cloneElement,
  isValidElement,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { type LocalAudioTrack, type RemoteAudioTrack } from 'livekit-client';
import {
  type AgentState,
  type TrackReferenceOrPlaceholder,
  useMultibandTrackVolume,
} from '@livekit/components-react';
import {
  type Coordinate,
  useAgentAudioVisualizerGridAnimator,
} from '@/hooks/agents-ui/use-agent-audio-visualizer-grid';
import { cn } from '@workspace/ui/lib/utils';

/** Idle / dim dot (neutral grey) */
const DOT_GREY = { r: 208, g: 210, b: 218 };
/** Active / night blue — matches theme foreground #181632 */
const DOT_NIGHT = { r: 24, g: 22, b: 50 };

function mixDotColor(t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(DOT_GREY.r + (DOT_NIGHT.r - DOT_GREY.r) * u);
  const g = Math.round(DOT_GREY.g + (DOT_NIGHT.g - DOT_GREY.g) * u);
  const b = Math.round(DOT_GREY.b + (DOT_NIGHT.b - DOT_GREY.b) * u);
  return `rgb(${r},${g},${b})`;
}

function cloneSingleChild(
  children: ReactNode | ReactNode[],
  props?: Record<string, unknown>,
  key?: unknown,
) {
  return Children.map(children, (child) => {
    // Checking isValidElement is the safe way and avoids a typescript error too.
    if (isValidElement(child) && Children.only(children)) {
      const childProps = child.props as Record<string, unknown>;
      if (childProps.className) {
        // make sure we retain classnames of both passed props and child
        props ??= {};
        props.className = cn(childProps.className as string, props.className as string);
        props.style = {
          ...(childProps.style as CSSProperties),
          ...(props.style as CSSProperties),
        };
      }
      return cloneElement(child, { ...props, key: key ? String(key) : undefined });
    }
    return child;
  });
}

export const AgentAudioVisualizerGridCellVariants = cva(
  [
    'w-1 h-1 rounded-full bg-current/10 place-self-center',
    'transition-colors duration-[85ms] ease-out',
    'data-[lk-highlighted=true]:bg-current',
  ],
  {
    variants: {
      size: {
        icon: ['w-[2px] h-[2px]'],
        sm: ['w-[4px] h-[4px]'],
        md: ['w-[8px] h-[8px]'],
        lg: ['w-[12px] h-[12px]'],
        xl: ['w-[16px] h-[16px]'],
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export const AgentAudioVisualizerGridVariants = cva('grid', {
  variants: {
    size: {
      icon: ['gap-[2px]'],
      sm: ['gap-[4px]'],
      md: ['gap-[8px]'],
      lg: ['gap-[12px]'],
      xl: ['gap-[16px]'],
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

/**
 * Configuration options for the grid visualizer.
 */
export interface GridOptions {
  /**
   * The radius for the animation spread effect.
   */
  radius?: number;
  /**
   * The interval in milliseconds between animation frames.
   * @defaultValue 100
   */
  interval?: number;
  /**
   * The number of rows in the grid.
   * @defaultValue 5
   */
  rowCount?: number;
  /**
   * The number of columns in the grid.
   * @defaultValue 5
   */
  columnCount?: number;
  /**
   * Additional CSS class names to apply to the container.
   */
  className?: string;
}

const sizeDefaults = {
  icon: 3,
  sm: 5,
  md: 5,
  lg: 5,
  xl: 5,
};

function useGrid(
  size: VariantProps<typeof AgentAudioVisualizerGridVariants>['size'] = 'md',
  columnCount = sizeDefaults[size as keyof typeof sizeDefaults],
  rowCount = sizeDefaults[size as keyof typeof sizeDefaults],
) {
  return useMemo(() => {
    const _columnCount = columnCount;
    const _rowCount = rowCount ?? columnCount;
    const items = new Array(_columnCount * _rowCount).fill(0).map((_, idx) => idx);

    return { columnCount: _columnCount, rowCount: _rowCount, items };
  }, [columnCount, rowCount]);
}

/** Radial ripple: phase travels outward from center; audio only scales how strong it reads */
function speakingRadialIntensity(
  col: number,
  row: number,
  columnCount: number,
  rowCount: number,
  phase: number,
  envelope: number,
): number {
  const cx = (columnCount - 1) / 2;
  const cy = (rowCount - 1) / 2;
  const dx = col - cx;
  const dy = row - cy;
  const dist = Math.hypot(dx, dy);
  const maxR = Math.hypot(cx, cy) + 1e-6;
  /** Spatial frequency so ~2 ripples fit across half the grid */
  const k = (Math.PI * 1.25) / maxR;
  const angle = Math.atan2(dy, dx);
  const wobble = Math.sin(phase - dist * k + angle * 0.35);
  const radial = 0.5 + 0.5 * wobble;
  /** Voice gently boosts contrast; motion stays mostly from phase */
  const gain = 0.28 + envelope * 0.62;
  /** Keep dots visible: baseline grey with wave pushing toward night blue */
  const t = 0.38 + radial * gain * 0.55;
  return Math.max(0, Math.min(1, t));
}

interface GridCellProps {
  index: number;
  state: AgentState;
  interval: number;
  rowCount: number;
  columnCount: number;
  highlightedCoordinate: Coordinate;
  speakingIntensity?: number;
  children?: ReactNode;
}

const GridCell = memo(function GridCell({
  index,
  state,
  interval,
  rowCount,
  columnCount,
  highlightedCoordinate,
  speakingIntensity,
  children,
}: GridCellProps) {
  if (state === 'speaking' && speakingIntensity !== undefined) {
    return cloneSingleChild(children, {
      'data-lk-index': index,
      'data-lk-highlighted': false,
      className: 'shadow-none',
      style: {
        backgroundColor: mixDotColor(speakingIntensity),
        opacity: 1,
        transform: 'scale(1)',
        transition: 'background-color 90ms ease-out',
      },
    });
  }

  const isHighlighted =
    highlightedCoordinate.x === index % columnCount &&
    highlightedCoordinate.y === Math.floor(index / columnCount);

  const transitionDurationInSeconds = interval / (isHighlighted ? 1000 : 100);

  return cloneSingleChild(children, {
    'data-lk-index': index,
    'data-lk-highlighted': isHighlighted,
    style: {
      transitionDuration: `${transitionDurationInSeconds}s`,
    },
  });
});

/**
 * Props for the AgentAudioVisualizerGrid component.
 */
export type AgentAudioVisualizerGridProps = GridOptions & {
  /**
   * The size of the visualizer.
   * @defaultValue 'md'
   */
  size?: 'icon' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * The current state of the agent. Determines the animation pattern.
   * @defaultValue 'connecting'
   */
  state?: AgentState;
  /**
   * The color of the grid cells in hexidecimal format.
   */
  color?: `#${string}`;
  /**
   * The audio track to visualize. Can be a local/remote audio track or a track reference.
   */
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder;
  /**
   * Optional band levels when speaking (e.g. from an AnalyserNode). Averaged into a
   * slow envelope; does not drive per-column FFT shape while speaking.
   */
  frequencies?: number[];
  /**
   * Additional CSS class names to apply to the container.
   */
  className?: string;
  /**
   * Custom element to render as grid cells. Each child receives data-lk-index
   * and data-lk-highlighted props.
   */
  children?: ReactNode;
} & VariantProps<typeof AgentAudioVisualizerGridVariants>;

/**
 * A grid-style audio visualizer that responds to agent state and audio levels.
 * Displays an animated grid of cells that react to the current agent state
 * and audio volume when speaking.
 *
 * @extends ComponentProps<'div'>
 *
 * @example
 * ```tsx
 * <AgentAudioVisualizerGrid
 *   size="md"
 *   state="speaking"
 *   rowCount={5}
 *   columnCount={5}
 *   audioTrack={agentAudioTrack}
 * />
 * ```
 */
export function AgentAudioVisualizerGrid({
  size = 'md',
  state = 'connecting',
  radius,
  color,
  rowCount: _rowCount = 5,
  columnCount: _columnCount = 5,
  interval = 100,
  className,
  children,
  audioTrack,
  frequencies,
  style,
  ...props
}: AgentAudioVisualizerGridProps & ComponentProps<'div'>) {
  const { columnCount, rowCount, items } = useGrid(size, _columnCount, _rowCount);
  const highlightedCoordinate = useAgentAudioVisualizerGridAnimator(
    state,
    rowCount,
    columnCount,
    interval,
    radius,
  );
  const volumeBands = useMultibandTrackVolume(audioTrack, {
    bands: columnCount,
    loPass: 100,
    hiPass: 200,
  });

  const frequenciesRef = useRef(frequencies ?? []);
  frequenciesRef.current = frequencies ?? [];

  const volumeBandsRef = useRef(volumeBands);
  volumeBandsRef.current = volumeBands;

  const [speakingWave, setSpeakingWave] = useState({ phase: 0, envelope: 0 });

  useEffect(() => {
    if (state !== 'speaking') return;

    let rafId: number;
    let phase = 0;
    let envelope = 0;

    const loop = () => {
      const fftBands = frequenciesRef.current;
      const volBands = volumeBandsRef.current;
      let raw = 0;
      if (fftBands.length > 0) {
        raw = fftBands.reduce((a, b) => a + b, 0) / fftBands.length;
      } else if (volBands.length > 0) {
        raw = volBands.reduce((a, b) => a + b, 0) / volBands.length;
      }
      /** Heavy smoothing so motion is radial-first, not “FFT twitchy” */
      envelope = envelope * 0.94 + raw * 0.06;
      /** Steady travel speed + small boost when there is speech energy */
      phase += 0.052 + envelope * 0.045;

      setSpeakingWave({ phase, envelope });
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [state]);

  const speakingIntensities = useMemo(() => {
    if (state !== 'speaking') return null;
    const { phase, envelope } = speakingWave;
    const out = new Array(columnCount * rowCount);
    for (let idx = 0; idx < out.length; idx++) {
      const col = idx % columnCount;
      const row = Math.floor(idx / columnCount);
      out[idx] = speakingRadialIntensity(col, row, columnCount, rowCount, phase, envelope);
    }
    return out;
  }, [state, speakingWave, columnCount, rowCount]);

  if (children && Array.isArray(children)) {
    throw new Error('AgentAudioVisualizerGrid children must be a single element.');
  }

  return (
    <div
      data-lk-state={state}
      className={cn(
        AgentAudioVisualizerGridVariants({ size }),
        !color && 'text-foreground',
        className,
      )}
      style={
        {
          ...style,
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          ...(color ? { color } : {}),
        } as CSSProperties
      }
      {...props}
    >
      {items.map((idx) => (
        <GridCell
          key={idx}
          index={idx}
          state={state}
          interval={interval}
          rowCount={rowCount}
          columnCount={columnCount}
          highlightedCoordinate={highlightedCoordinate}
          speakingIntensity={speakingIntensities?.[idx]}
        >
          {children ?? <div className={AgentAudioVisualizerGridCellVariants({ size })} />}
        </GridCell>
      ))}
    </div>
  );
}
