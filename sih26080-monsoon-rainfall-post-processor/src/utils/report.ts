import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateForecastReport = async (
  stationName: string,
  year: number,
  leadTime: number,
  metrics: any,
  regimeBreakdowns: any
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header Background
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Monsoon AI Post-Processor', 14, 20);
    doc.setFontSize(12);
    doc.text('Meteorological Forecast Evaluation Dossier', 14, 28);
    
    // Metadata section
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFontSize(11);
    doc.text(`Station: ${stationName}`, 14, 50);
    doc.text(`Season: ${year === 0 ? 'All Years (2023-2025)' : year}`, 14, 57);
    doc.text(`Lead Time: ${leadTime === 0 ? 'All Lead Times' : 'Day +' + leadTime}`, 14, 64);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 71);
    
    // Section: Core Metrics
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Performance Metrics (Corrected vs Baseline)', 14, 85);
    
    autoTable(doc, {
      startY: 90,
      head: [['Metric', 'Baseline (Raw)', 'Post-Processed', 'Improvement']],
      body: [
        [
          'Mean Abs. Error (MAE)',
          `${(metrics.maeBaseline || 0).toFixed(2)} mm`,
          `${(metrics.maeCorrected || 0).toFixed(2)} mm`,
          metrics.maeBaseline > 0 ? `-${(((metrics.maeBaseline - metrics.maeCorrected) / metrics.maeBaseline) * 100).toFixed(1)}%` : '0.0%'
        ],
        [
          'Root Mean Sq. Error',
          `${(metrics.rmseBaseline || 0).toFixed(2)} mm`,
          `${(metrics.rmseCorrected || 0).toFixed(2)} mm`,
          metrics.rmseBaseline > 0 ? `-${(((metrics.rmseBaseline - metrics.rmseCorrected) / metrics.rmseBaseline) * 100).toFixed(1)}%` : '0.0%'
        ],
        ['Systematic Bias', `${(metrics.biasBaseline || 0).toFixed(2)} mm`, `${(metrics.biasCorrected || 0).toFixed(2)} mm`, 'N/A'],
        [
          'Pearson Correlation (R)',
          `${(metrics.pearsonRaw || 0).toFixed(3)}`,
          `${(metrics.pearsonCorrected || 0).toFixed(3)}`,
          Math.abs(metrics.pearsonRaw) > 0 ? `+${(((metrics.pearsonCorrected - metrics.pearsonRaw) / Math.abs(metrics.pearsonRaw)) * 100).toFixed(1)}%` : 'N/A'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }, // blue-500
      styles: { fontSize: 10, cellPadding: 5 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 90;
    
    // Section: Regime Breakdown
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Regime-Specific Diagnostic Breakdown', 14, finalY + 15);
    
    const regimeData = regimeBreakdowns.map((r: any) => [
      r.regime,
      r.imdThreshold,
      `${r.sampleCount} days`,
      `${r.maeBaseline.toFixed(1)}`,
      `${r.maeCorrected.toFixed(1)}`,
      `+${r.improvementPct.toFixed(1)}%`
    ]);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Regime', 'IMD Threshold', 'Frequency', 'Raw MAE', 'AI MAE', 'Correction Imprv.']],
      body: regimeData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      styles: { fontSize: 10, cellPadding: 4 }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Official AI Evaluation Report • Page ${i} of ${pageCount}`,
        pageWidth / 2, 
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    const sanitizedName = stationName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Monsoon_Dossier_${sanitizedName}.pdf`);
  } catch (err) {
    console.error('Error generating PDF', err);
  }
};
