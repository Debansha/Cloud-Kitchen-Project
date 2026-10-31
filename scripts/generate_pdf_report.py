import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#666666"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "VIT Assessment 7 Project Proposal Report — Debansha Datta (24BCE0446)")
            self.setStrokeColor(colors.HexColor("#E0E0E0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "AI-Driven Cloud Kitchen Order Scheduling & Preparation Management System")
        self.setStrokeColor(colors.HexColor("#E0E0E0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        
        self.restoreState()

def create_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    primary_color = colors.HexColor("#1A237E")  # Deep Navy
    secondary_color = colors.HexColor("#283593")
    accent_color = colors.HexColor("#00838F")
    dark_text = colors.HexColor("#212121")
    light_bg = colors.HexColor("#F5F7FA")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=accent_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=dark_text,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1B5E20"),
        spaceBefore=4,
        spaceAfter=6
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=dark_text
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []

    # Document Header
    story.append(Paragraph("ASSESSMENT 7: PROJECT PROPOSAL REPORT", title_style))
    story.append(Paragraph("Vellore Institute of Technology (VIT) — School of Computer Science & Engineering", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=15))

    # Student & Project Details Metadata Table
    meta_data = [
        [Paragraph("Student Name", table_header), Paragraph("Debansha Datta", table_cell)],
        [Paragraph("Register Number", table_header), Paragraph("24BCE0446", table_cell)],
        [Paragraph("Course & Code", table_header), Paragraph("Database Management Systems (DBMS) / Operating Systems", table_cell)],
        [Paragraph("Project Title", table_header), Paragraph("AI-Driven Cloud Kitchen Order Scheduling & Preparation Management System", table_cell)],
        [Paragraph("Application Domain", table_header), Paragraph("Food Technology & Cloud Kitchen Operations / Intelligent Resource Scheduling Systems", table_cell)],
        [Paragraph("Target Assessment", table_header), Paragraph("Assessment 7 (System Architecture, Proposal & Database Design)", table_cell)]
    ]
    
    t_meta = Table(meta_data, colWidths=[1.8*inch, 5.2*inch])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), primary_color),
        ('BACKGROUND', (1,0), (1,-1), light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D0D7DE")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    # Section 1: Application Domain & Context
    story.append(Paragraph("1. Application Domain & Context", h1_style))
    story.append(Paragraph(
        "In modern urban food service delivery, <b>Cloud Kitchens</b> (delivery-only restaurants) prepare hundreds of orders simultaneously "
        "for multiple online food aggregator platforms. Unlike traditional dine-in restaurants, cloud kitchens handle high order velocity, "
        "unpredictable demand spikes, and strict delivery time SLAs. The core operational bottleneck revolves around <b>cooking station resource allocation</b> "
        "and <b>real-time ingredient inventory control</b>. Efficient management requires combining relational database integrity (ACID transactions and "
        "concurrency control) with operating system process scheduling theory (CPU dispatching and burst time optimization).",
        body_style
    ))

    # Section 2: Problem Statement & Target Users
    story.append(Paragraph("2. Problem Statement & Target Users", h1_style))
    story.append(Paragraph(
        "Current cloud kitchen operations suffer from severe order queue bottlenecks, high customer waiting times, and inventory data inconsistencies. "
        "Because traditional management software processes orders sequentially without predicting food preparation times, short-preparation items get stuck "
        "behind long-preparation items (the Convoy Effect). Furthermore, concurrent online ordering creates data race conditions on ingredient inventory, "
        "leading to negative stock counts or unfulfilled orders.",
        body_style
    ))
    story.append(Paragraph("<b>Target Stakeholders:</b>", body_style))
    story.append(Paragraph("• <b>Cloud Kitchen Managers:</b> Require real-time visibility into station workloads, ingredient levels, and performance KPIs.", bullet_style))
    story.append(Paragraph("• <b>Kitchen Staff & Chefs:</b> Require optimized, prioritized task sequences across cooking stations.", bullet_style))
    story.append(Paragraph("• <b>Delivery Platforms & End Customers:</b> Benefit from accurate preparation estimates and reduced waiting times.", bullet_style))

    # Section 3: Existing Approach & Limitations
    story.append(Paragraph("3. Existing Approach & Limitations", h1_style))
    story.append(Paragraph(
        "Conventional cloud kitchen management systems employ a simple <b>First-Come-First-Served (FCFS)</b> queue mechanism. Incoming orders are stored in "
        "a simple relational table and assigned to available kitchen staff manually or sequentially based purely on arrival timestamps.",
        body_style
    ))
    story.append(Paragraph("<b>Limitations of Existing System:</b>", body_style))
    story.append(Paragraph("• <b>Convoy Effect (OS Bottleneck):</b> Long-preparation orders (e.g., a 25-minute pizza) block quick orders (e.g., a 2-minute beverage) arriving behind them.", bullet_style))
    story.append(Paragraph("• <b>Race Conditions & Stock Inconsistency (DBMS Failure):</b> Simultaneous orders without row-level locking cause race conditions and negative inventory.", bullet_style))
    story.append(Paragraph("• <b>Unmanaged Priority Starvation:</b> Expedited or VIP orders cannot bypass standard queues dynamically, causing process starvation.", bullet_style))
    story.append(Paragraph("• <b>Lack of Real-Time Analytics:</b> Operations lack Gantt chart timelines and comparative metrics to evaluate station utilization.", bullet_style))

    # Section 4: Proposed Solution & System Architecture
    story.append(Paragraph("4. Proposed Database & System Solution", h1_style))
    story.append(Paragraph(
        "We propose an <b>AI-Driven Cloud Kitchen Management System</b> that integrates <b>MySQL relational database architecture</b> with <b>OS CPU scheduling algorithms</b> "
        "(Shortest Job First and Priority Scheduling with Aging) and an AI Prep-Time Burst Predictor.",
        body_style
    ))
    
    sol_points = [
        "<b>ACID-Compliant Order Processing:</b> Explicit transaction boundaries (BEGIN ... COMMIT/ROLLBACK) ensure order creation and inventory deductions succeed atomically.",
        "<b>Pessimistic Concurrency Control:</b> Uses MySQL row-level locking (SELECT ... FOR UPDATE) during inventory validation to prevent race conditions.",
        "<b>Encapsulated Stored Procedures:</b> Server-side stored procedures (sp_PlaceOrder, sp_AssignToStation, sp_CompleteOrderItem, sp_CheckInventory) handle complex transactions.",
        "<b>Automated Audit Triggers:</b> Database triggers auto-insert status audit logs and generate low-stock warning alerts.",
        "<b>Analytical Views:</b> Database views (vw_active_orders, vw_dashboard_metrics, vw_station_utilization, vw_algorithm_comparison) abstract real-time reporting."
    ]
    for pt in sol_points:
        story.append(Paragraph(f"• {pt}", bullet_style))

    # Section 5: Innovation & Novelty
    story.append(Paragraph("5. Innovation & Novelty / Differentiation", h1_style))
    story.append(Paragraph(
        "<b>Innovation:</b> Synthesizes Operating System Process Scheduling (SJF & Priority Aging) with Database Concurrency Control. Food orders act as CPU processes, "
        "cooking stations act as CPU cores, and prep times act as burst times. AI estimates burst times to schedule tasks via SJF, while MySQL row-level locks guarantee 100% database consistency.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Novelty / Differentiation:</b> Unlike conventional POS or kitchen display systems, our solution dynamically re-orders tasks based on AI predicted burst times, "
        "prevents process starvation via 60-second priority aging, and visualizes multi-station timelines via interactive HTML5 Canvas Gantt charts.",
        body_style
    ))

    # Section 6: SDG Alignment
    story.append(Paragraph("6. Sustainable Development Goals (SDG) Alignment", h1_style))
    sdg_data = [
        [Paragraph("SDG Goal", table_header), Paragraph("Alignment & Operational Impact", table_header)],
        [Paragraph("<b>SDG 8</b>: Decent Work & Economic Growth", table_cell), Paragraph("Optimizes kitchen staff workflow, eliminates idle bottlenecks, and maximizes economic throughput.", table_cell)],
        [Paragraph("<b>SDG 9</b>: Industry, Innovation & Infrastructure", table_cell), Paragraph("Introduces AI scheduling and robust database concurrency control into commercial food service infrastructure.", table_cell)],
        [Paragraph("<b>SDG 12</b>: Responsible Consumption & Production", table_cell), Paragraph("Prevents ingredient waste through precise real-time inventory tracking and automated reorder level alerts.", table_cell)]
    ]
    t_sdg = Table(sdg_data, colWidths=[2.5*inch, 4.5*inch])
    t_sdg.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), secondary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D0D7DE")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_sdg)
    story.append(Spacer(1, 10))

    # Section 7: Proposed Technical Approach & DBMS Schema
    story.append(Paragraph("7. Proposed Technical Approach & DBMS Design", h1_style))
    story.append(Paragraph("<b>Database Relational Schema (8 Normalized 3NF Tables):</b>", h2_style))
    
    schema_data = [
        [Paragraph("Table Name", table_header), Paragraph("Primary Key", table_header), Paragraph("Foreign Keys", table_header), Paragraph("Key Columns & Purpose", table_header)],
        [Paragraph("stations", table_cell), Paragraph("id", table_cell), Paragraph("-", table_cell), Paragraph("name, type (ENUM), status, capacity", table_cell)],
        [Paragraph("menu_items", table_cell), Paragraph("id", table_cell), Paragraph("-", table_cell), Paragraph("name, category, base_prep_time_minutes, price", table_cell)],
        [Paragraph("inventory", table_cell), Paragraph("id", table_cell), Paragraph("-", table_cell), Paragraph("ingredient_name, quantity, unit, reorder_level", table_cell)],
        [Paragraph("menu_item_ingredients", table_cell), Paragraph("id", table_cell), Paragraph("menu_item_id, ingredient_id", table_cell), Paragraph("quantity_needed (Junction Table)", table_cell)],
        [Paragraph("orders", table_cell), Paragraph("id", table_cell), Paragraph("-", table_cell), Paragraph("customer_name, priority (1-5), status, total_amount", table_cell)],
        [Paragraph("order_items", table_cell), Paragraph("id", table_cell), Paragraph("order_id, menu_item_id, station_id", table_cell), Paragraph("predicted_prep_time, actual_prep_time, status", table_cell)],
        [Paragraph("preparation_logs", table_cell), Paragraph("id", table_cell), Paragraph("order_item_id, station_id", table_cell), Paragraph("event_type, details, created_at (Audit Log)", table_cell)],
        [Paragraph("scheduling_metrics", table_cell), Paragraph("id", table_cell), Paragraph("order_id, order_item_id", table_cell), Paragraph("algorithm_type (FCFS/SJF/Priority), wait_time", table_cell)]
    ]
    t_schema = Table(schema_data, colWidths=[1.5*inch, 0.8*inch, 1.7*inch, 3.0*inch])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D0D7DE")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_schema)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>DBMS Procedure & Concurrency Lock Code Structure:</b>", h2_style))
    
    proc_code = (
        "DELIMITER //\n"
        "CREATE PROCEDURE sp_PlaceOrder(\n"
        "    IN p_customer_name VARCHAR(200), IN p_priority INT, IN p_items JSON, OUT p_order_id INT\n"
        ")\n"
        "BEGIN\n"
        "    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;\n"
        "    START TRANSACTION;\n"
        "    INSERT INTO orders (customer_name, priority, status) VALUES (p_customer_name, p_priority, 'Pending');\n"
        "    SET p_order_id = LAST_INSERT_ID();\n"
        "    -- Deduct stock with Pessimistic Row Locking: SELECT quantity FROM inventory WHERE id = ? FOR UPDATE;\n"
        "    COMMIT;\n"
        "END //\n"
        "DELIMITER ;"
    )
    story.append(Paragraph(f"<font fontName='Courier' size=8>{proc_code.replace(chr(10), '<br/>')}</font>", code_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Summary for Assessment 7:</b> Implementation, working prototype, and evaluation results are prepared and ready for demonstration during the physical hackathon / Final Project Review.", body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully: {filename}")

if __name__ == '__main__':
    target_path = r"C:\Users\deban\OneDrive\Documents\CODING\WEB DEV\PROJECTS\Cloud Kitchen\Assessment_7_Report_Debansha_Datta_24BCE0446.pdf"
    artifact_path = r"C:\Users\deban\.gemini\antigravity\brain\2fddd82b-f2d5-497d-9965-78c4d8d48b7f\Assessment_7_Report_Debansha_Datta_24BCE0446.pdf"
    create_pdf(target_path)
    create_pdf(artifact_path)
