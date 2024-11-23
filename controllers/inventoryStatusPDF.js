const PDFDocument = require('pdfkit');
const path = require('path');

function createInventoryStatus(inventoryData) {
    return new Promise((resolve, reject) => {
        let doc = new PDFDocument({ 
            size: "A4", 
            margin: 50,
            bufferPages: true
        });
        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            resolve(pdfData.toString('base64'));
        });

        generateHeader(doc);
        generateInventoryTable(doc, inventoryData);
        generateFooter(doc);

        doc.end();
    });
}

function generateHeader(doc) {
   // const logoPath = path.join(__dirname, '..', 'Public', 'images', 'CEU-Logo.png');
    const pageWidth = 595.28;
   // const logoWidth = 100;

    doc
 
        const logoPath = path.join(__dirname, '..', 'Public', 'images', 'CEU-Logo.png');
        doc
            .image(logoPath, 50, 45, { width: 50 })
            .fillColor("#444444")
            .fontSize(20)
            .text("CEU VAULT", 110, 57)
            .fontSize(10)
            .text("CEU VAULT - INVENTORY STATUS", 200, 50, { align: "right" })
            .text("Teaching, Learning, and Technology Section", 200, 65, { align: "right" })
            .text("CEU Malolos", 200, 80, { align: "right" })
            .moveDown()
            .text("Generated on: " + new Date().toLocaleString(), 0, 140, { align: "center", width: pageWidth })
            .moveDown(2);
    
}

function generateInventoryTable(doc, inventoryData) {
    // Table configuration
    const startX = 50;
    const startY = 180;
    const rowHeight = 25;
    const pageHeight = 750;
    
    const columns = {
        id: { x: startX, width: 80, title: 'Category ID' },
        name: { x: startX + 90, width: 300, title: 'Category Name' },
        quantity: { x: startX + 400, width: 100, title: 'Quantity' }
    };

    // Sort data
    const sortedData = [...inventoryData].sort((a, b) => a.category_id - b.category_id);

    let currentY = startY;

    // Draw table header
    drawTableHeader(doc, columns, currentY);
    currentY += rowHeight;

    // Draw rows
    sortedData.forEach((item, i) => {
        // Check if we need a new page
        if (currentY > pageHeight) {
            doc.addPage();
            currentY = startY;
            drawTableHeader(doc, columns, currentY);
            currentY += rowHeight;
        }

        // Draw row background
        if (i % 2 === 0) {
            doc
                .fillColor("#f8f9fa")
                .rect(startX, currentY, 500, rowHeight)
                .fill();
        }

        // Draw row data
        doc
            .fillColor("#444444")
            .font("Helvetica")
            .fontSize(10);

        // Draw cell borders and content
        Object.keys(columns).forEach(key => {
            const column = columns[key];
            const value = key === 'id' ? item.category_id.toString() :
                         key === 'name' ? item.category_name :
                         item.quantity_available.toString();

            // Draw cell border
            doc
                .strokeColor("#dddddd")
                .lineWidth(0.5)
                .rect(column.x, currentY, column.width, rowHeight)
                .stroke();

            // Draw cell content
            doc.text(
                value,
                column.x + 5,
                currentY + 7,
                {
                    width: column.width - 10,
                    align: key === 'quantity' ? 'center' : 'left'
                }
            );
        });

        currentY += rowHeight;
    });

    // Draw final border
    doc
        .strokeColor("#dddddd")
        .lineWidth(0.5)
        .rect(startX, startY, 500, currentY - startY)
        .stroke();
}

function drawTableHeader(doc, columns, y) {
    // Draw header background
    doc
        .fillColor("#f0f0f0")
        .rect(50, y, 500, 25)
        .fill();

    // Draw header text
    doc
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .fontSize(10);

    Object.entries(columns).forEach(([key, column]) => {
        doc.text(
            column.title,
            column.x + 5,
            y + 7,
            {
                width: column.width - 10,
                align: key === 'quantity' ? 'center' : 'left'
            }
        );
    });

    // Draw header border
    doc
        .strokeColor("#dddddd")
        .lineWidth(0.5)
        .rect(50, y, 500, 25)
        .stroke();
}

function generateFooter(doc) {
    doc
        .fontSize(10)
        .fillColor("#444444")
        .text(
            "This inventory status report was generated from CEU VAULT system.",
            50,
            780,
            { align: "center", width: 500 }
        );
}

module.exports = {
    createInventoryStatus
};