/**
 * SvgView.tsx
 * -----------
 * Render ArtDocument thành SVG React nodes — nhất quán 100% với SVG Engine
 * (cùng transform, cùng thuộc tính) để WYSIWYG. Hỗ trợ virtual rendering
 * (culledIds bị ẩn) và chọn element (onElementPointerDown).
 */

import React from 'react';
import { ArtDocument, ArtElement, Layer } from '../../domain/model';
import { elementTransform } from '../../domain/bounds';
import { rectFromXYWH } from '../../domain/geometry';

export interface SvgViewProps {
  document: ArtDocument;
  culledIds: Set<string>;
  onElementPointerDown: (e: React.PointerEvent, el: ArtElement) => void;
  onElementDoubleClick?: (el: ArtElement) => void;
}

export function SvgView({ document, culledIds, onElementPointerDown, onElementDoubleClick }: SvgViewProps) {
  const vb = rectFromXYWH(0, 0, document.width, document.height);
  const vbString = `${vb.left} ${vb.top} ${vb.right - vb.left} ${vb.bottom - vb.top}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={document.width}
      height={document.height}
      viewBox={vbString}
      data-testid="artviva-svg"
    >
      {document.background ? (
        <rect x={0} y={0} width={document.width} height={document.height} fill={document.background} />
      ) : null}
      {document.layers.map((layer) => (
        <LayerGroup
          key={layer.id}
          layer={layer}
          culledIds={culledIds}
          onElementPointerDown={onElementPointerDown}
          onElementDoubleClick={onElementDoubleClick}
        />
      ))}
    </svg>
  );
}

function LayerGroup({ layer, culledIds, onElementPointerDown, onElementDoubleClick }: {
  layer: Layer;
  culledIds: Set<string>;
  onElementPointerDown: SvgViewProps['onElementPointerDown'];
  onElementDoubleClick?: SvgViewProps['onElementDoubleClick'];
}) {
  return (
    <g
      data-layer-id={layer.id}
      opacity={layer.opacity}
      display={layer.visible ? undefined : 'none'}
    >
      {layer.elements.map((el) => (
        <ElementNode
          key={el.id}
          el={el}
          culledIds={culledIds}
          onElementPointerDown={onElementPointerDown}
          onElementDoubleClick={onElementDoubleClick}
        />
      ))}
    </g>
  );
}

function ElementNode({ el, culledIds, onElementPointerDown, onElementDoubleClick }: {
  el: ArtElement;
  culledIds: Set<string>;
  onElementPointerDown: SvgViewProps['onElementPointerDown'];
  onElementDoubleClick?: SvgViewProps['onElementDoubleClick'];
}) {
  if (culledIds.has(el.id)) {
    return (
      <g key={el.id} data-el-id={el.id} display="none">
        <GroupChildren el={el} culledIds={culledIds} onElementPointerDown={onElementPointerDown} onElementDoubleClick={onElementDoubleClick} />
      </g>
    );
  }

  const common = {
    transform: elementTransform(el),
    opacity: el.opacity < 1 ? el.opacity : undefined,
    display: el.visible ? undefined : 'none',
    onPointerDown: (e: React.PointerEvent) => onElementPointerDown(e, el),
    style: { cursor: 'pointer' as const },
  };
  const fill = el.fill ?? 'none';
  const stroke = el.stroke ?? 'none';
  const strokeCommon = {
    stroke,
    strokeWidth: el.stroke ? el.strokeWidth : undefined,
    strokeDasharray: el.strokeDasharray ?? undefined,
    strokeLinecap: el.stroke ? el.strokeLinecap : undefined,
  };

  switch (el.type) {
    case 'rect':
      return (
        <rect key={el.id} data-el-id={el.id} {...common} fill={fill} fillOpacity={el.fillOpacity}
          width={el.width} height={el.height} rx={el.rx || undefined} ry={el.ry || undefined}
          {...strokeCommon} />
      );
    case 'circle':
      return (
        <circle key={el.id} data-el-id={el.id} {...common} fill={fill} fillOpacity={el.fillOpacity}
          r={el.radius} {...strokeCommon} />
      );
    case 'ellipse':
      return (
        <ellipse key={el.id} data-el-id={el.id} {...common} fill={fill} fillOpacity={el.fillOpacity}
          rx={el.radiusX} ry={el.radiusY} {...strokeCommon} />
      );
    case 'line':
      return (
        <line key={el.id} data-el-id={el.id} {...common} x1={0} y1={0}
          x2={el.x2 - el.x} y2={el.y2 - el.y} {...strokeCommon} />
      );
    case 'polygon':
    case 'polyline':
      return (
        <polygon key={el.id} data-el-id={el.id} {...common} fill={fill} fillOpacity={el.fillOpacity}
          points={el.points} {...strokeCommon} />
      );
    case 'path':
      return (
        <path key={el.id} data-el-id={el.id} {...common} fill={fill} fillOpacity={el.fillOpacity}
          d={el.d} {...strokeCommon} />
      );
    case 'image':
      return (
        <image key={el.id} data-el-id={el.id} {...common} href={el.href}
          x={0} y={0} width={el.width} height={el.height}
          preserveAspectRatio="xMidYMid meet" />
      );
    case 'text':
      return (
        <text key={el.id} data-el-id={el.id} {...common} x={0} y={0}
          fontSize={el.fontSize} fontFamily={el.fontFamily}
          fontWeight={el.fontWeight} textAnchor={el.textAnchor}
          letterSpacing={el.letterSpacing || undefined}
          fill={fill} fillOpacity={el.fillOpacity}
          onDoubleClick={() => onElementDoubleClick?.(el)}>
          {el.text}
        </text>
      );
    case 'group':
      return (
        <g key={el.id} data-el-id={el.id} {...common}>
          <GroupChildren el={el} culledIds={culledIds} onElementPointerDown={onElementPointerDown} onElementDoubleClick={onElementDoubleClick} />
        </g>
      );
  }
}

function GroupChildren({ el, culledIds, onElementPointerDown, onElementDoubleClick }: {
  el: ArtElement;
  culledIds: Set<string>;
  onElementPointerDown: SvgViewProps['onElementPointerDown'];
  onElementDoubleClick?: SvgViewProps['onElementDoubleClick'];
}) {
  if (el.type !== 'group') return null;
  return (
    <>
      {el.children.map((child) => (
        <ElementNode key={child.id} el={child} culledIds={culledIds} onElementPointerDown={onElementPointerDown} onElementDoubleClick={onElementDoubleClick} />
      ))}
    </>
  );
}
