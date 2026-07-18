"""
AI Data Analyst - Reports Router & Service
============================================
Generates professional PDF and Excel reports
with executive summaries, statistics, data quality insights, and ML assessments.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
import uuid
import pandas as pd
from datetime import datetime

from app.services.data_service import DataService
from app.services.eda_service import EDAService
from app.services.stats_service import StatisticsService
from app.services.ai_service import AIService
from app.services.jupyter_service import JupyterService
from app.config import settings
from app.utils.logger import setup_logger

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter()
logger = setup_logger(__name__)


def _generate_pdf_report(dataset_id: str, file_path: str):
    """Generate a comprehensive PDF report for the dataset using ReportLab."""
    df = DataService.get_dataframe(dataset_id)
    info = DataService.get_dataset_info(dataset_id)
    eda = EDAService.full_eda(dataset_id)
    ai_insights = AIService.generate_auto_insights(dataset_id)
    
    rows, cols = df.shape
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Brand styles (light background, charcoal text, blue/indigo accents)
    primary_color = colors.HexColor("#4F46E5")
    secondary_color = colors.HexColor("#7C3AED")
    text_color = colors.HexColor("#1E293B")
    bg_light = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#E2E8F0")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.white,
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.white,
        alignment=1
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCharcoal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_color
    )
    
    bold_style = ParagraphStyle(
        'BodyTextBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    bullet_style = ParagraphStyle(
        'BulletCharcoal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_color,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=6
    )
    
    italic_style = ParagraphStyle(
        'BodyItalic',
        parent=body_style,
        fontName='Helvetica-Oblique'
    )
    
    story = []
    
    # ─── HEADER BANNER ────────────────────────────────────────────────────────
    header_data = [
        [Paragraph("🧠 AI Data Analyst Report", title_style)],
        [Paragraph(f"Generated on {now} | Dataset: {info.get('filename', 'Dataset')}", subtitle_style)]
    ]
    header_table = Table(header_data, colWidths=[doc.width])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,1), (-1,-1), 15),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 15))
    
    # ─── SECTION: OVERVIEW ────────────────────────────────────────────────────
    story.append(Paragraph("📊 Dataset Overview", h1_style))
    
    overview_data = [
        [
            Paragraph("<b>Total Rows:</b>", body_style), Paragraph(f"{rows:,}", bold_style),
            Paragraph("<b>Columns:</b>", body_style), Paragraph(f"{cols}", bold_style),
        ],
        [
            Paragraph("<b>Memory:</b>", body_style), Paragraph(f"{info['memory_usage_mb']} MB", bold_style),
            Paragraph("<b>Missing Values:</b>", body_style), Paragraph(f"{info['missing_values_total']:,}", bold_style),
        ],
        [
            Paragraph("<b>Duplicate Rows:</b>", body_style), Paragraph(f"{info['duplicate_rows']:,}", bold_style),
            Paragraph("<b>Quality Grade:</b>", body_style), Paragraph(f"{eda['data_quality_score']['grade']}", bold_style),
        ],
        [
            Paragraph("<b>Numeric Cols:</b>", body_style), Paragraph(f"{len(info['column_types']['numeric'])}", bold_style),
            Paragraph("<b>Categorical Cols:</b>", body_style), Paragraph(f"{len(info['column_types']['categorical'])}", bold_style),
        ]
    ]
    overview_table = Table(overview_data, colWidths=[110, doc.width/2 - 110, 110, doc.width/2 - 110])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 15))
    
    # ─── SECTION: EXECUTIVE SUMMARY ───────────────────────────────────────────
    story.append(Paragraph("🎯 Executive Summary", h1_style))
    summary_text = ai_insights.get('executive_summary', 'No summary available.')
    summary_table = Table([[Paragraph(summary_text, italic_style)]], colWidths=[doc.width])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('PADDING', (0,0), (-1,-1), 12),
        ('LINELEFT', (0,0), (0,-1), 4, primary_color),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))
    
    # ─── SECTION: DATA QUALITY ────────────────────────────────────────────────
    story.append(Paragraph("✅ Data Quality Score", h1_style))
    score = eda['data_quality_score']['score']
    breakdown = eda['data_quality_score']['breakdown']
    
    quality_header_style = ParagraphStyle(
        'QualityScoreTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color,
        alignment=1
    )
    
    quality_data = [
        [Paragraph(f"Score: {score:.0f} / 100", quality_header_style), "", "", ""],
        [
            Paragraph("<b>Completeness:</b>", body_style), Paragraph(f"{breakdown['completeness']:.0f}%", bold_style),
            Paragraph("<b>Uniqueness:</b>", body_style), Paragraph(f"{breakdown['uniqueness']:.0f}%", bold_style),
        ],
        [
            Paragraph("<b>Consistency:</b>", body_style), Paragraph(f"{breakdown['consistency']:.0f}%", bold_style),
            Paragraph("<b>Validity:</b>", body_style), Paragraph(f"{breakdown['validity']:.0f}%", bold_style),
        ]
    ]
    quality_table = Table(quality_data, colWidths=[110, doc.width/2 - 110, 110, doc.width/2 - 110])
    quality_table.setStyle(TableStyle([
        ('SPAN', (0,0), (3,0)),
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
    ]))
    story.append(quality_table)
    story.append(Spacer(1, 15))
    
    # ─── SECTION: COLUMN INFORMATION ──────────────────────────────────────────
    story.append(Paragraph("📋 Column Information (Top 25 Columns)", h1_style))
    
    col_header_style = ParagraphStyle(
        'ColHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=primary_color
    )
    
    col_info_data = [[
        Paragraph("Column Name", col_header_style),
        Paragraph("Data Type", col_header_style),
        Paragraph("Category", col_header_style),
        Paragraph("Missing Count", col_header_style),
        Paragraph("Unique Count", col_header_style)
    ]]
    
    for col_detail in info["column_details"][:25]:
        col_info_data.append([
            Paragraph(col_detail['name'], body_style),
            Paragraph(col_detail['dtype'], body_style),
            Paragraph(col_detail['type_category'], body_style),
            Paragraph(f"{col_detail['missing_count']} ({col_detail['missing_pct']:.1f}%)", body_style),
            Paragraph(str(col_detail['unique_count']), body_style)
        ])
        
    col_info_table = Table(col_info_data, colWidths=[doc.width*0.28, doc.width*0.16, doc.width*0.16, doc.width*0.22, doc.width*0.18])
    col_info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(col_info_table)
    story.append(Spacer(1, 15))
    
    # PageBreak to keep findings and ML together nicely
    story.append(PageBreak())
    
    # ─── SECTION: KEY FINDINGS & RECOMMENDATIONS ─────────────────────────────
    story.append(Paragraph("🔍 Key Findings", h1_style))
    for f in ai_insights.get("key_findings", []):
        story.append(Paragraph(f"• {f}", bullet_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("💡 Recommendations", h1_style))
    for r in ai_insights.get("recommendations", []):
        story.append(Paragraph(f"• {r}", bullet_style))
    story.append(Spacer(1, 15))
    
    # ─── SECTION: ML READINESS ────────────────────────────────────────────────
    story.append(Paragraph("🤖 ML Readiness Assessment", h1_style))
    ml_readiness = ai_insights.get('ml_readiness', {})
    
    ml_data = [
        [
            Paragraph("<b>ML Grade:</b>", body_style), Paragraph(f"{ml_readiness.get('grade', 'N/A')}", bold_style),
            Paragraph("<b>Readiness Score:</b>", body_style), Paragraph(f"{ml_readiness.get('score', 0)}/100", bold_style),
        ],
        [
            Paragraph("<b>Suggested Models:</b>", body_style),
            Paragraph(", ".join(ml_readiness.get('suggested_models', ['N/A'])), body_style),
            "", ""
        ]
    ]
    ml_table = Table(ml_data, colWidths=[110, doc.width/2 - 110, 110, doc.width/2 - 110])
    ml_table.setStyle(TableStyle([
        ('SPAN', (1,1), (3,1)),
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(ml_table)
    story.append(Spacer(1, 20))
    
    # Footer info
    story.append(Spacer(1, 20))
    footer_text = f"Report generated by AI Data Analyst. Powered by Python + FastAPI + ReportLab."
    story.append(Paragraph(footer_text, ParagraphStyle('FooterText', parent=body_style, fontSize=8, textColor=colors.HexColor("#94A3B8"), alignment=1)))
    
    doc.build(story)


@router.get("/reports/{dataset_id}/pdf", summary="Generate PDF Report")
def generate_pdf_report(dataset_id: str):
    """Generate and download a full PDF analysis report."""
    try:
        report_id = str(uuid.uuid4())[:8]
        filename = f"report_{dataset_id[:8]}_{report_id}.pdf"
        file_path = os.path.join(settings.REPORTS_DIR, filename)

        _generate_pdf_report(dataset_id, file_path)

        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename="ai_data_analyst_report.pdf",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        logger.error(f"Report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        logger.error(f"Report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{dataset_id}/excel", summary="Generate Excel Report")
def generate_excel_report(dataset_id: str):
    """Generate and download an Excel report with multiple sheets."""
    try:
        df = DataService.get_dataframe(dataset_id)
        info = DataService.get_dataset_info(dataset_id)
        stats = StatisticsService.descriptive_stats(df)

        report_id = str(uuid.uuid4())[:8]
        filename = f"report_{dataset_id[:8]}_{report_id}.xlsx"
        file_path = os.path.join(settings.REPORTS_DIR, filename)

        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            # Sheet 1: Dataset preview
            df.head(100).to_excel(writer, sheet_name="Preview (First 100)", index=False)

            # Sheet 2: Descriptive statistics
            if stats:
                stats_df = pd.DataFrame(stats).T
                stats_df.to_excel(writer, sheet_name="Descriptive Statistics")

            # Sheet 3: Column info
            col_info_df = pd.DataFrame(info["column_details"])
            col_info_df.to_excel(writer, sheet_name="Column Information", index=False)

            # Sheet 4: Missing values
            if info["missing_info"]:
                missing_df = pd.DataFrame([
                    {"Column": k, "Missing Count": v["count"], "Missing %": v["percentage"]}
                    for k, v in info["missing_info"].items()
                ])
                missing_df.to_excel(writer, sheet_name="Missing Values", index=False)

        return FileResponse(
            file_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename="ai_data_analyst_report.xlsx",
        )
    except Exception as e:
        logger.error(f"Excel report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/{dataset_id}/jupyter")
def download_jupyter_report(dataset_id: str):
    """Generate and download a Jupyter Notebook replication of analysis."""
    try:
        file_path = JupyterService.generate_notebook(dataset_id)
        return FileResponse(
            file_path,
            media_type="application/x-ipynb+json",
            filename="infinitics_notebook.ipynb",
        )
    except Exception as e:
        logger.error(f"Jupyter export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
