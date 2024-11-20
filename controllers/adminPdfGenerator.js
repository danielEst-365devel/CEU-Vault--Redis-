// pdfGenerator.js
const PDFDocument = require('pdfkit');
const path = require('path');

function createInvoice(details) {
    return new Promise((resolve, reject) => {
        let doc = new PDFDocument({ size: "A4", margin: 50 });
        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            resolve(pdfData.toString('base64'));
        });

        generateHeader(doc);
        generateCustomerInformation(doc, details);
        generateInvoiceTable(doc, details);

        if (details.cancelledDetails) {
            generateCancelledRequestsTable(doc, details.cancelledDetails);
        }

        generateFooter(doc);

        doc.end();
    });
}

function generateHeader(doc) {
    const logoPath = path.join(__dirname, '..', 'Public', 'images', 'CEU-Logo.png');
    doc
        .image(logoPath, 50, 45, { width: 50 })
        .fillColor("#444444")
        .fontSize(20)
        .text("CEU VAULT", 110, 57)
        .fontSize(10)
        .text("CEU VAULT.", 200, 50, { align: "right" })
        .text("Teaching, Learning, and Technology Section", 200, 65, { align: "right" })
        .text("CEU Malolos", 200, 80, { align: "right" })
        .moveDown();
}
function generateCustomerInformation(doc, details) {
    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Service Request", 50, 160);

    generateHr(doc, 185);

    const customerInformationTop = 200;

    doc
        .fontSize(10)
        .text("Name:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(`${details.firstName} ${details.lastName}`, 150, customerInformationTop)
        .font("Helvetica")
        .text("Department:", 50, customerInformationTop + 15)
        .text(details.departmentName, 150, customerInformationTop + 15)
        .text("Email:", 50, customerInformationTop + 30)
        .text(details.email, 150, customerInformationTop + 30)
        .text("Nature of Service:", 50, customerInformationTop + 45)
        .text(details.natureOfService, 150, customerInformationTop + 45)
        .text("Purpose:", 50, customerInformationTop + 60)
        .text(details.purpose, 150, customerInformationTop + 60)
        .text("Venue:", 50, customerInformationTop + 75)
        .text(details.venue, 150, customerInformationTop + 75)
        .moveDown();

    generateHr(doc, customerInformationTop + 90);
}
function generateInvoiceTable(doc, details) {
    const invoiceTableTop = 330;

    // Add title for the Approved Requests table
    doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Approved Requests", 50, invoiceTableTop - 30);

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        invoiceTableTop,
        "Category",
        "Quantity",
        "Date Requested",
        "Time Requested",
        "Return Time"
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");

    details.equipmentCategories.forEach((item, i) => {
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.category,
            item.quantity,
            item.dateRequested,
            item.timeRequested,
            item.returnTime
        );
        generateHr(doc, position + 20);
    });
}
function generateCancelledRequestsTable(doc, cancelledDetails) {
    const cancelledTableTop = 500; // Adjust the position as needed

    // Add title for the Cancelled Requests table
    doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Cancelled Requests", 50, cancelledTableTop - 30);

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        cancelledTableTop,
        "Category",
        "Quantity",
        "Date Requested",
        "Time Requested",
        "Return Time"
    );
    generateHr(doc, cancelledTableTop + 20);
    doc.font("Helvetica");

    cancelledDetails.equipmentCategories.forEach((item, i) => {
        const position = cancelledTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.category,
            item.quantity,
            item.dateRequested,
            item.timeRequested,
            item.returnTime
        );
        generateHr(doc, position + 20);
    });
}
function generateCancelledRequestsTable(doc, cancelledDetails) {
    const cancelledTableTop = 500; // Adjust the position as needed

    // Add title for the Cancelled Requests table
    doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Cancelled Requests", 50, cancelledTableTop - 30);

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        cancelledTableTop,
        "Category",
        "Quantity",
        "Date Requested",
        "Time Requested",
        "Return Time"
    );
    generateHr(doc, cancelledTableTop + 20);
    doc.font("Helvetica");

    cancelledDetails.equipmentCategories.forEach((item, i) => {
        const position = cancelledTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.category,
            item.quantity,
            item.dateRequested,
            item.timeRequested,
            item.returnTime
        );
        generateHr(doc, position + 20);
    });
}
function generateFooter(doc) {
    doc
        .fontSize(10)
        .text(
            "Your requests has been successfully processed. Please keep this document for future reference. This receipt is digitally generated, signature is not required.",
            50,
            780,
            { align: "center", width: 500 }
        );
}
function generateTableRow(
    doc,
    y,
    category,
    quantity,
    dateRequested,
    timeRequested,
    returnTime
) {
    doc
        .fontSize(10)
        .text(category, 50, y)
        .text(quantity, 150, y)
        .text(dateRequested, 250, y)
        .text(timeRequested, 350, y)
        .text(returnTime, 450, y);
}
function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

module.exports = {
    createInvoice,
    generateHeader,
    generateCustomerInformation,
    generateInvoiceTable,
    generateCancelledRequestsTable,
    generateFooter,
    generateTableRow,
    generateHr
};