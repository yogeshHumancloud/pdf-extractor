import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelection } from '../contexts/SelectionContext';
import {
  canvasToPDF,
  // pdfToCanvas,
  normalizeRect,
  generateSelectionId,
  isPointInBox,
  isValidBox
} from '../utils/coordinateUtils';
import './SelectionCanvas.css';

function SelectionCanvas({ pageNum, pageWidth, pageHeight, viewport, scale = 1.5, fieldLocations = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const {
    selectionMode,
    getSelectionsForPage,
    addSelection,
    removeSelection
  } = useSelection();

  // Local state for active drawing
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [hoveredSelection, setHoveredSelection] = useState(null);

  // Get selections for this page
  const pageSelections = getSelectionsForPage(pageNum);

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // // Draw field boundaries (if fieldLocations provided)
    // fieldLocations.forEach(field => {
    //   if (field.page !== pageNum || !field.coordinates) return;

    //   // Convert PDF coordinates to canvas coordinates
    //   const canvasBox = pdfToCanvas(field.coordinates, viewport, scale);

    //   // Draw semi-transparent field boundary
    //   ctx.strokeStyle = field.hasCoordinates ? 'rgba(76, 175, 80, 0.6)' : 'rgba(158, 158, 158, 0.6)';
    //   ctx.lineWidth = 1;
    //   ctx.setLineDash([3, 3]);
    //   ctx.strokeRect(canvasBox.x, canvasBox.y, canvasBox.width, canvasBox.height);

    //   // Draw field name label (small text)
    //   ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    //   ctx.font = '10px monospace';
    //   ctx.fillText(field.name, canvasBox.x + 2, canvasBox.y - 2);
    // });

    // // Reset line dash for selections
    // ctx.setLineDash([]);

    // Draw existing selections (in canvas coordinates)
    pageSelections.forEach(selection => {
      const isHovered = hoveredSelection === selection.id;

      // Draw filled rectangle
      ctx.fillStyle = isHovered
        ? 'rgba(102, 126, 234, 0.4)'
        : 'rgba(102, 126, 234, 0.3)';
      ctx.fillRect(
        selection.canvasBox.x,
        selection.canvasBox.y,
        selection.canvasBox.width,
        selection.canvasBox.height
      );

      // Draw border
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        selection.canvasBox.x,
        selection.canvasBox.y,
        selection.canvasBox.width,
        selection.canvasBox.height
      );

      // Draw delete button if hovered
      if (isHovered) {
        const btnSize = 20;
        const btnX = selection.canvasBox.x + selection.canvasBox.width - btnSize - 5;
        const btnY = selection.canvasBox.y + 5;

        // Draw button background
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(btnX, btnY, btnSize, btnSize);

        // Draw X
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(btnX + 5, btnY + 5);
        ctx.lineTo(btnX + btnSize - 5, btnY + btnSize - 5);
        ctx.moveTo(btnX + btnSize - 5, btnY + 5);
        ctx.lineTo(btnX + 5, btnY + btnSize - 5);
        ctx.stroke();
      }
    });

    // Draw active selection being drawn
    if (isDragging && startPoint && currentPoint) {
      const width = currentPoint.x - startPoint.x;
      const height = currentPoint.y - startPoint.y;

      // Normalize rectangle to handle any drag direction
      const rect = normalizeRect({
        x: startPoint.x,
        y: startPoint.y,
        width,
        height
      });

      // Draw filled rectangle
      ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      // Draw dashed border
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }, [pageSelections, isDragging, startPoint, currentPoint, hoveredSelection]);

  // Redraw canvas when selections or drawing state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse down - start drawing
  const handleMouseDown = useCallback((e) => {
    if (!selectionMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Account for canvas internal coordinates vs display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicking on delete button of hovered selection
    if (hoveredSelection) {
      const selection = pageSelections.find(s => s.id === hoveredSelection);
      if (selection) {
        const btnSize = 20;
        const btnX = selection.canvasBox.x + selection.canvasBox.width - btnSize - 5;
        const btnY = selection.canvasBox.y + 5;
        const btnBox = { x: btnX, y: btnY, width: btnSize, height: btnSize };

        if (isPointInBox({ x, y }, btnBox)) {
          removeSelection(hoveredSelection);
          setHoveredSelection(null);
          return;
        }
      }
    }

    // Start new selection
    setIsDragging(true);
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
  }, [selectionMode, hoveredSelection, pageSelections, removeSelection]);

  // Mouse move - update current point
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Account for canvas internal coordinates vs display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isDragging) {
      setCurrentPoint({ x, y });
    } else if (selectionMode) {
      // Check if hovering over a selection (in canvas coordinates)
      let found = null;
      for (const selection of pageSelections) {
        if (isPointInBox({ x, y }, selection.canvasBox)) {
          found = selection.id;
          break;
        }
      }
      setHoveredSelection(found);
    }
  }, [isDragging, selectionMode, pageSelections]);

  // Mouse up - complete selection
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !startPoint || !currentPoint) return;

    const width = currentPoint.x - startPoint.x;
    const height = currentPoint.y - startPoint.y;

    // Normalize rectangle (already in canvas coordinates)
    const canvasRect = normalizeRect({
      x: startPoint.x,
      y: startPoint.y,
      width,
      height
    });

    // Only create selection if it has meaningful size (> 10px)
    if (canvasRect.width > 10 && canvasRect.height > 10) {
      // Convert to PDF coordinates
      const pdfBox = canvasToPDF(canvasRect, viewport, scale);

      // Validate PDF box
      if (isValidBox(pdfBox)) {
        // Create selection object
        const selection = {
          id: generateSelectionId(),
          pageNum,
          boundingBox: pdfBox,
          canvasBox: canvasRect
        };

        addSelection(selection);
      }
    }

    // Reset dragging state
    setIsDragging(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [isDragging, startPoint, currentPoint, pageNum, viewport, scale, addSelection]);

  // Mouse leave - cancel dragging
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setStartPoint(null);
      setCurrentPoint(null);
    }
    setHoveredSelection(null);
  }, [isDragging]);

  // Update cursor style
  const getCursorStyle = () => {
    if (!selectionMode) return 'default';
    if (isDragging) return 'crosshair';
    if (hoveredSelection) return 'pointer';
    return 'crosshair';
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        className={`selection-canvas ${selectionMode ? 'active' : ''}`}
        width={pageWidth}
        height={pageHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          height: '100%',
          cursor: getCursorStyle(),
          pointerEvents: selectionMode ? 'auto' : 'none'
        }}
      />
    </div>
  );
}

export default SelectionCanvas;
