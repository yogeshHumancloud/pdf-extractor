/**
 * Table Detector for PDF.js
 * Detects and extracts table structures from PDF pages
 */

/**
 * Detect tables in a PDF page based on text element positioning
 * @param {PDFPageProxy} page - PDF.js page object
 * @param {Object} textContent - Extracted text content from textExtractor
 * @returns {Promise<Array>} Array of detected tables
 */
export async function detectTables(page, textContent) {
  try {
    const elements = textContent.elements;

    if (!elements || elements.length === 0) {
      return [];
    }

    const tables = [];

    // Group elements by Y-coordinate (rows)
    const rowMap = new Map();
    const yThreshold = 5; // Pixels threshold for same row

    elements.forEach(element => {
      let foundRow = false;

      // Check if element belongs to existing row
      for (let [rowY, rowElements] of rowMap) {
        if (Math.abs(element.y - rowY) < yThreshold) {
          rowElements.push(element);
          foundRow = true;
          break;
        }
      }

      // Create new row if not found
      if (!foundRow) {
        rowMap.set(element.y, [element]);
      }
    });

    // Convert to array and sort by Y (top to bottom)
    const rows = Array.from(rowMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([y, elements]) => ({
        y: y,
        elements: elements.sort((a, b) => a.x - b.x) // Sort by X (left to right)
      }));

    // Detect potential tables (rows with similar column structure)
    let currentTable = [];
    let lastColumnCount = 0;
    let lastColumnPositions = [];

    rows.forEach((row, index) => {
      const columnCount = row.elements.length;

      // Check if this row could be part of a table (at least 2 columns)
      if (columnCount >= 2) {
        // Get column x-positions for this row
        const columnPositions = row.elements.map(el => el.x);

        if (currentTable.length === 0) {
          // Start new potential table
          currentTable.push(row);
          lastColumnCount = columnCount;
          lastColumnPositions = columnPositions;
        } else {
          // Check if column structure is similar
          const isColumnAligned = checkColumnAlignment(
            lastColumnPositions,
            columnPositions,
            20 // X-position threshold in pixels
          );

          const columnCountSimilar = Math.abs(columnCount - lastColumnCount) <= 1;

          if (isColumnAligned && columnCountSimilar) {
            // Add to current table
            currentTable.push(row);

            // Update average column positions
            lastColumnPositions = mergeColumnPositions(lastColumnPositions, columnPositions);
          } else {
            // Save current table if it has at least 2 rows
            if (currentTable.length >= 2) {
              tables.push(formatTable(currentTable));
            }

            // Start new potential table
            currentTable = [row];
            lastColumnCount = columnCount;
            lastColumnPositions = columnPositions;
          }
        }
      } else {
        // Not a table row - save current table if exists
        if (currentTable.length >= 2) {
          tables.push(formatTable(currentTable));
        }
        currentTable = [];
        lastColumnCount = 0;
        lastColumnPositions = [];
      }
    });

    // Save last table if exists
    if (currentTable.length >= 2) {
      tables.push(formatTable(currentTable));
    }

    return tables;

  } catch (error) {
    console.error('Error detecting tables:', error);
    return [];
  }
}

/**
 * Check if column positions align between rows
 * @private
 */
function checkColumnAlignment(positions1, positions2, threshold = 20) {
  if (positions1.length === 0 || positions2.length === 0) {
    return false;
  }

  // Check if at least 50% of columns align
  let alignedCount = 0;
  const minLength = Math.min(positions1.length, positions2.length);

  for (let i = 0; i < minLength; i++) {
    if (Math.abs(positions1[i] - positions2[i]) < threshold) {
      alignedCount++;
    }
  }

  return alignedCount >= minLength * 0.5;
}

/**
 * Merge column positions from multiple rows to get average
 * @private
 */
function mergeColumnPositions(positions1, positions2) {
  const merged = [];
  const maxLength = Math.max(positions1.length, positions2.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < positions1.length && i < positions2.length) {
      merged.push((positions1[i] + positions2[i]) / 2);
    } else if (i < positions1.length) {
      merged.push(positions1[i]);
    } else {
      merged.push(positions2[i]);
    }
  }

  return merged;
}

/**
 * Format detected table rows into structured data
 * @private
 */
function formatTable(rows) {
  // Build column structure based on x-positions
  const allXPositions = new Set();
  rows.forEach(row => {
    row.elements.forEach(el => allXPositions.add(Math.round(el.x)));
  });

  // Sort column positions
  const columnPositions = Array.from(allXPositions).sort((a, b) => a - b);

  // Map each element to its column
  const formattedRows = rows.map(row => {
    const rowData = new Array(columnPositions.length).fill('');

    row.elements.forEach(el => {
      // Find closest column position
      const columnIndex = findClosestColumnIndex(
        Math.round(el.x),
        columnPositions,
        20 // threshold
      );

      if (columnIndex !== -1) {
        // Append text if cell already has content (merged cells)
        if (rowData[columnIndex]) {
          rowData[columnIndex] += ' ' + el.text;
        } else {
          rowData[columnIndex] = el.text;
        }
      }
    });

    return rowData;
  });

  return {
    rowCount: formattedRows.length,
    columnCount: columnPositions.length,
    data: formattedRows,
    headers: formattedRows[0], // Assume first row is headers
    rows: formattedRows.slice(1), // Data rows
    position: {
      top: rows[0].y,
      bottom: rows[rows.length - 1].y,
      left: Math.min(...rows.flatMap(r => r.elements.map(el => el.x))),
      right: Math.max(...rows.flatMap(r => r.elements.map(el => el.x + el.width)))
    }
  };
}

/**
 * Find the closest column index for a given x-position
 * @private
 */
function findClosestColumnIndex(x, columnPositions, threshold = 20) {
  let closestIndex = -1;
  let minDistance = Infinity;

  columnPositions.forEach((colX, index) => {
    const distance = Math.abs(x - colX);
    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Convert table to CSV format
 * @param {Object} table - Table object from detectTables
 * @returns {string} CSV formatted string
 */
export function tableToCSV(table) {
  if (!table || !table.data) {
    return '';
  }

  return table.data
    .map(row => {
      return row
        .map(cell => {
          // Escape quotes and wrap in quotes if contains comma or quotes
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',');
    })
    .join('\n');
}

/**
 * Convert table to JSON array
 * @param {Object} table - Table object from detectTables
 * @returns {Array<Object>} Array of row objects
 */
export function tableToJSON(table) {
  if (!table || !table.data || table.data.length < 2) {
    return [];
  }

  const headers = table.headers;
  const dataRows = table.rows;

  return dataRows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      const key = header.trim() || `column_${index}`;
      obj[key] = row[index] || '';
    });
    return obj;
  });
}

/**
 * Detect table borders using PDF rendering operations
 * This is a more advanced detection method that looks for actual drawn lines
 * @param {PDFPageProxy} page - PDF.js page object
 * @returns {Promise<Array>} Array of detected table borders
 */
export async function detectTableBorders(page) {
  try {
    const operators = await page.getOperatorList();

    const lines = [];
    let currentX = 0;
    let currentY = 0;

    // Parse operator list to find line-drawing operations
    for (let i = 0; i < operators.fnArray.length; i++) {
      const fn = operators.fnArray[i];
      const args = operators.argsArray[i];

      // OPS.moveTo
      if (fn === 21) {
        currentX = args[0];
        currentY = args[1];
      }
      // OPS.lineTo
      else if (fn === 22) {
        lines.push({
          x1: currentX,
          y1: currentY,
          x2: args[0],
          y2: args[1]
        });
        currentX = args[0];
        currentY = args[1];
      }
    }

    // Group lines into table structures
    // This is simplified - a full implementation would cluster nearby lines
    return lines;

  } catch (error) {
    console.warn('Could not detect table borders:', error);
    return [];
  }
}
