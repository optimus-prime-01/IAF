#!/usr/bin/env python3
"""
VayuReader Backend v2 - Complete Documentation Book Generator

This script creates a SINGLE comprehensive PDF book containing all documentation
with a professional cover page, table of contents, and organized sections.

Usage:
    python generate_complete_book.py

Output:
    VayuReader_Backend_v2_Complete_Documentation.pdf
"""

import os
import sys
import re
from pathlib import Path
from datetime import datetime
from textwrap import wrap

from fpdf import FPDF
from fpdf.enums import XPos, YPos

# Configuration - uses relative paths (script is in docs folder)
SCRIPT_DIR = Path(__file__).parent.resolve()
DOCS_DIR = SCRIPT_DIR  # Script is in the docs folder
OUTPUT_DIR = DOCS_DIR / "pdf_output"
OUTPUT_FILE = "VayuReader_Backend.pdf"

# Document structure - in order
DOCUMENT_STRUCTURE = [
    # Part 1: Introduction & Overview
    {"section": "Part I: Introduction", "files": []},
    {"title": "Documentation Index", "file": "README.md"},
    
    # Part 2: Design Documents  
    {"section": "Part II: Design Documents", "files": []},
    {"title": "High-Level Design (HLD)", "file": "HLD.md"},
    {"title": "Low-Level Design (LLD)", "file": "LLD.md"},
    
    # Part 3: User Guides
    {"section": "Part III: User Guides", "files": []},
    {"title": "User Manual", "file": "USER_MANUAL.md"},
    {"title": "Setup & Installation", "file": "SETUP.md"},
    {"title": "Configuration", "file": "CONFIGURATION.md"},
    
    # Part 4: API Reference
    {"section": "Part IV: API Reference", "files": []},
    {"title": "API Endpoints", "file": "ENDPOINTS.md"},
    {"title": "Authentication", "file": "AUTH.md"},
    {"title": "Data Models", "file": "MODELS.md"},
    
    # Part 5: Infrastructure
    {"section": "Part V: Infrastructure", "files": []},
    {"title": "Nginx Configuration", "file": "NGINX.md"},
    {"title": "Rate Limiting", "file": "RATE_LIMITING.md"},
    {"title": "Caching Strategy", "file": "CACHING.md"},
    {"title": "Elasticsearch", "file": "ELASTICSEARCH.md"},
    
    # Part 6: Services
    {"section": "Part VI: Services & Scripts", "files": []},
    {"title": "Services Documentation", "file": "SERVICES.md"},
    {"title": "CLI Scripts", "file": "SCRIPTS.md"},
    {"title": "Server-Sent Events", "file": "SSE.md"},
    {"title": "SSE Integration Guide", "file": "SSE_INTEGRATION.md"},
    {"title": "Audit System", "file": "AUDITING.md"},
    
    # Part 7: Operations
    {"section": "Part VII: Operations", "files": []},
    {"title": "Security Hardening", "file": "SECURITY.md"},
    {"title": "Performance Optimization", "file": "PERFORMANCE.md"},
    {"title": "Deployment Guide", "file": "DEPLOYMENT.md"},
    {"title": "Testing", "file": "testing.md"},
    {"title": "Contributing Guidelines", "file": "CONTRIBUTING.md"},
]


class DocumentationBook(FPDF):
    """Custom PDF class for the complete documentation book."""
    
    def __init__(self):
        super().__init__()
        self.current_section = ""
        self.current_chapter = ""
        self.toc_entries = []  # (level, title, page_num, link_dest)
        self.chapter_start_pages = {}
        self.link_destinations = {}  # Store link destinations
        
        # Page settings
        self.set_auto_page_break(auto=True, margin=25)
        self.set_margins(25, 25, 25)
        
        # Add fonts
        self.add_font('DejaVu', '', r'C:\Windows\Fonts\arial.ttf', uni=True)
        self.add_font('DejaVu', 'B', r'C:\Windows\Fonts\arialbd.ttf', uni=True)
        self.add_font('DejaVu', 'I', r'C:\Windows\Fonts\ariali.ttf', uni=True)
        self.add_font('Consolas', '', r'C:\Windows\Fonts\consola.ttf', uni=True)
    
    def header(self):
        """Page header."""
        if self.page_no() > 2:  # Skip cover and TOC pages
            self.set_font('DejaVu', 'I', 8)
            self.set_text_color(128, 128, 128)
            
            # Left: Section name
            self.set_x(25)
            self.cell(80, 8, self.current_section, align='L')
            
            # Right: Chapter name
            self.set_x(105)
            chapter_display = self.current_chapter[:50] + "..." if len(self.current_chapter) > 50 else self.current_chapter
            self.cell(80, 8, chapter_display, align='R')
            
            self.ln(12)
    
    def footer(self):
        """Page footer."""
        if self.page_no() > 1:  # Skip cover page
            self.set_y(-20)
            
            # Line
            self.set_draw_color(200, 200, 200)
            self.set_line_width(0.3)
            self.line(25, self.get_y(), 185, self.get_y())
            
            self.ln(5)
            self.set_font('DejaVu', '', 8)
            self.set_text_color(128, 128, 128)
            
            # Left: Document title
            self.set_x(25)
            self.cell(80, 8, "VayuReader Backend v2 Documentation", align='L')
            
            # Center: Page number
            self.cell(30, 8, f"- {self.page_no()} -", align='C')
            
            # Right: Classification
            self.cell(50, 8, "RESTRICTED", align='R')
    
    def cover_page(self):
        """Generate professional cover page."""
        self.add_page()
        
        # Top decorative bar
        self.set_fill_color(26, 54, 93)
        self.rect(0, 0, 210, 8, 'F')
        
        # Logo/Symbol area
        self.set_y(60)
        self.set_font('DejaVu', 'B', 72)
        self.set_text_color(26, 54, 93)
        self.cell(0, 30, chr(0x2708), align='C')  # Airplane symbol
        
        # Main Title
        self.set_y(110)
        self.set_font('DejaVu', 'B', 36)
        self.set_text_color(26, 54, 93)
        self.cell(0, 15, "VayuReader", align='C')
        
        self.ln(18)
        self.set_font('DejaVu', 'B', 28)
        self.set_text_color(44, 82, 130)
        self.cell(0, 12, "Backend v2", align='C')
        
        # Subtitle
        self.ln(20)
        self.set_font('DejaVu', '', 18)
        self.set_text_color(74, 85, 104)
        self.cell(0, 10, "Complete Technical Documentation", align='C')
        
        # Decorative line
        self.ln(25)
        self.set_draw_color(26, 54, 93)
        self.set_line_width(2)
        self.line(60, self.get_y(), 150, self.get_y())
        
        # Metadata box
        self.ln(35)
        self.set_font('DejaVu', '', 12)
        self.set_text_color(74, 85, 104)
        
        current_date = datetime.now().strftime("%B %Y")
        
        # Centered metadata
        metadata = [
            ("Version", "2.0"),
            ("Date", current_date),
            ("Classification", "RESTRICTED"),
            ("Organization", "Indian Air Force"),
            ("Department", "VayuReader Development Team")
        ]
        
        for label, value in metadata:
            self.set_x(55)
            self.set_font('DejaVu', 'B', 11)
            self.cell(40, 8, f"{label}:", align='R')
            self.set_font('DejaVu', '', 11)
            self.cell(60, 8, value, align='L')
            self.ln()
        
        # Bottom decorative bar
        self.set_fill_color(26, 54, 93)
        self.rect(0, 289, 210, 8, 'F')
        
        # Footer text
        self.set_y(275)
        self.set_font('DejaVu', 'I', 9)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, "This document contains proprietary information", align='C')
    
    def table_of_contents(self):
        """Generate table of contents page with hyperlinks."""
        self.add_page()
        
        # Title
        self.set_font('DejaVu', 'B', 24)
        self.set_text_color(26, 54, 93)
        self.cell(0, 15, "Table of Contents", align='C')
        self.ln(20)
        
        # Line
        self.set_draw_color(26, 54, 93)
        self.set_line_width(1)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(10)
        
        # TOC entries with hyperlinks
        for level, title, page_num, link_dest in self.toc_entries:
            if level == 0:  # Part
                self.ln(5)
                self.set_font('DejaVu', 'B', 12)
                self.set_text_color(26, 54, 93)
                indent = 0
            elif level == 1:  # Chapter
                self.set_font('DejaVu', '', 10)
                self.set_text_color(49, 130, 206)  # Blue for clickable links
                indent = 10
            else:  # Sub-section
                self.set_font('DejaVu', '', 9)
                self.set_text_color(100, 100, 100)
                indent = 20
            
            self.set_x(25 + indent)
            
            # Title with dots leading to page number
            title_display = title
            page_str = str(page_num)
            page_width = self.get_string_width(page_str)
            
            available_width = 160 - indent - page_width - 5
            
            if self.get_string_width(title_display) > available_width - 10:
                while self.get_string_width(title_display + "...") > available_width - 10 and len(title_display) > 10:
                    title_display = title_display[:-1]
                title_display += "..."
            
            # Create clickable link for chapters
            if level == 1 and link_dest:
                # Store current position
                x_start = self.get_x()
                y_start = self.get_y()
                
                # Title as clickable link
                self.set_text_color(49, 130, 206)
                self.cell(self.get_string_width(title_display), 7, title_display, link=link_dest)
                
                # Dots
                dots_width = available_width - self.get_string_width(title_display) - 10
                num_dots = max(1, int(dots_width / 2))
                self.set_text_color(180, 180, 180)
                self.cell(dots_width, 7, "." * num_dots, align='R')
                
                # Page number as link
                self.set_text_color(49, 130, 206)
                self.cell(page_width + 5, 7, page_str, align='R', link=link_dest)
            else:
                # Non-clickable (parts and sub-sections)
                self.cell(available_width - 10, 7, title_display)
                
                # Dots
                dots_width = available_width - self.get_string_width(title_display) - 10
                num_dots = max(1, int(dots_width / 2))
                self.set_text_color(180, 180, 180)
                self.cell(dots_width, 7, "." * num_dots, align='R')
                
                # Page number
                if level == 0:
                    self.set_text_color(26, 54, 93)
                else:
                    self.set_text_color(100, 100, 100)
                self.cell(page_width + 5, 7, page_str, align='R')
            
            self.ln()
    
    def add_part_header(self, title):
        """Add a part header page."""
        self.add_page()
        self.current_section = title
        
        # Create link destination
        link_dest = self.add_link()
        self.set_link(link_dest)
        self.link_destinations[title] = link_dest
        
        # Vertical centering
        self.set_y(100)
        
        # Part title
        self.set_font('DejaVu', 'B', 28)
        self.set_text_color(26, 54, 93)
        self.cell(0, 15, title, align='C')
        
        # Decorative line
        self.ln(15)
        self.set_draw_color(26, 54, 93)
        self.set_line_width(1.5)
        self.line(60, self.get_y(), 150, self.get_y())
        
        # Record TOC entry
        self.toc_entries.append((0, title, self.page_no(), link_dest))
    
    def add_chapter_start(self, title):
        """Add chapter title page with link destination."""
        self.add_page()
        self.current_chapter = title
        self.chapter_start_pages[title] = self.page_no()
        
        # Create link destination for this chapter
        link_dest = self.add_link()
        self.set_link(link_dest)
        self.link_destinations[title] = link_dest
        
        # Chapter title
        self.set_font('DejaVu', 'B', 22)
        self.set_text_color(26, 54, 93)
        self.multi_cell(0, 12, self.clean_text(title))
        
        # Underline
        self.set_draw_color(26, 54, 93)
        self.set_line_width(0.8)
        self.line(25, self.get_y() + 3, 185, self.get_y() + 3)
        self.ln(15)
        
        # Record TOC entry with link
        self.toc_entries.append((1, title, self.page_no(), link_dest))
    
    def add_heading1(self, text):
        """Add H1 heading (within document)."""
        self.add_page()
        self.set_font('DejaVu', 'B', 18)
        self.set_text_color(26, 54, 93)
        
        text = self.clean_text(text)
        self.multi_cell(0, 11, text)
        
        # Underline
        self.set_draw_color(26, 54, 93)
        self.set_line_width(0.6)
        self.line(25, self.get_y() + 2, 185, self.get_y() + 2)
        self.ln(10)
    
    def add_heading2(self, text):
        """Add H2 heading."""
        self.ln(8)
        self.set_font('DejaVu', 'B', 14)
        self.set_text_color(44, 82, 130)
        
        text = self.clean_text(text)
        self.multi_cell(0, 9, text)
        
        # Light underline
        self.set_draw_color(203, 213, 224)
        self.set_line_width(0.3)
        self.line(25, self.get_y() + 1, 185, self.get_y() + 1)
        self.ln(6)
    
    def add_heading3(self, text):
        """Add H3 heading."""
        self.ln(5)
        self.set_font('DejaVu', 'B', 12)
        self.set_text_color(43, 108, 176)
        
        text = self.clean_text(text)
        self.multi_cell(0, 8, text)
        self.ln(4)
    
    def add_heading4(self, text):
        """Add H4 heading."""
        self.ln(3)
        self.set_font('DejaVu', 'B', 11)
        self.set_text_color(49, 130, 206)
        
        text = self.clean_text(text)
        self.multi_cell(0, 7, text)
        self.ln(3)
    
    def add_paragraph(self, text):
        """Add regular paragraph."""
        self.set_font('DejaVu', '', 10)
        self.set_text_color(45, 55, 72)
        
        text = self.clean_text(text)
        if text.strip():
            self.multi_cell(0, 6, text)
            self.ln(3)
    
    def add_code_block(self, code):
        """Add code block."""
        self.ln(3)
        
        # Background
        self.set_fill_color(30, 35, 50)
        
        self.set_font('Consolas', '', 8)
        self.set_text_color(220, 230, 240)
        
        code_lines = code.split('\n')
        
        for line in code_lines:
            # Wrap long lines
            if len(line) > 80:
                wrapped = wrap(line, 80)
                for wrapped_line in wrapped:
                    self.cell(160, 5, wrapped_line, fill=True)
                    self.ln(5)
            else:
                self.cell(160, 5, line if line else " ", fill=True)
                self.ln(5)
        
        self.ln(5)
    
    def add_list_item(self, text, level=0):
        """Add list item."""
        self.set_font('DejaVu', '', 10)
        self.set_text_color(45, 55, 72)
        
        indent = 5 + (level * 8)
        bullet = "•" if level == 0 else "○"
        
        text = self.clean_text(text)
        
        self.set_x(25 + indent)
        self.cell(5, 6, bullet)
        self.multi_cell(155 - indent, 6, text)
    
    def add_table(self, headers, rows):
        """Add table."""
        self.ln(5)
        
        # Calculate column widths
        num_cols = len(headers)
        col_width = 160 / num_cols
        
        # Header
        self.set_font('DejaVu', 'B', 9)
        self.set_fill_color(26, 54, 93)
        self.set_text_color(255, 255, 255)
        
        for header in headers:
            header = self.clean_text(header)[:25]
            self.cell(col_width, 8, header, border=1, fill=True, align='C')
        self.ln()
        
        # Rows
        self.set_font('DejaVu', '', 8)
        self.set_text_color(45, 55, 72)
        
        for i, row in enumerate(rows[:50]):  # Limit rows
            if i % 2 == 0:
                self.set_fill_color(247, 250, 252)
            else:
                self.set_fill_color(255, 255, 255)
            
            for cell in row:
                cell = self.clean_text(str(cell))[:28]
                self.cell(col_width, 6, cell, border=1, fill=True)
            self.ln()
        
        self.ln(5)
    
    def add_blockquote(self, text):
        """Add blockquote."""
        self.ln(3)
        self.set_fill_color(235, 248, 255)
        
        y_start = self.get_y()
        
        self.set_font('DejaVu', 'I', 10)
        self.set_text_color(44, 82, 130)
        
        self.set_x(30)
        text = self.clean_text(text)
        self.multi_cell(150, 6, text, fill=True)
        
        y_end = self.get_y()
        
        # Draw left border
        self.set_draw_color(49, 130, 206)
        self.set_line_width(1)
        self.line(25, y_start, 25, y_end)
        
        self.ln(5)
    
    def add_horizontal_rule(self):
        """Add horizontal rule."""
        self.ln(8)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.5)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(8)
    
    def clean_text(self, text):
        """Clean markdown formatting from text."""
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)
        text = re.sub(r'\*([^\*]+)\*', r'\1', text)
        text = re.sub(r'__([^_]+)__', r'\1', text)
        text = re.sub(r'_([^_]+)_', r'\1', text)
        text = re.sub(r'`([^`]+)`', r'\1', text)
        text = re.sub(r'<[^>]+>', '', text)
        return text.strip()


def parse_markdown(content):
    """Parse markdown content into structured elements."""
    lines = content.split('\n')
    elements = []
    
    i = 0
    in_code_block = False
    code_content = []
    in_table = False
    table_headers = []
    table_rows = []
    
    while i < len(lines):
        line = lines[i]
        
        # Code blocks
        if line.strip().startswith('```'):
            if in_code_block:
                elements.append(('code', '\n'.join(code_content)))
                code_content = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue
        
        if in_code_block:
            code_content.append(line)
            i += 1
            continue
        
        # Tables
        if '|' in line and line.strip().startswith('|'):
            cells = [c.strip() for c in line.split('|')[1:-1]]
            
            if not in_table:
                table_headers = cells
                in_table = True
            elif all(c.replace('-', '').replace(':', '') == '' for c in cells):
                pass  # Separator row
            else:
                table_rows.append(cells)
            
            i += 1
            continue
        elif in_table:
            if table_headers and table_rows:
                elements.append(('table', (table_headers, table_rows)))
            table_headers = []
            table_rows = []
            in_table = False
        
        # Headings
        if line.startswith('# '):
            elements.append(('h1', line[2:].strip()))
        elif line.startswith('## '):
            elements.append(('h2', line[3:].strip()))
        elif line.startswith('### '):
            elements.append(('h3', line[4:].strip()))
        elif line.startswith('#### '):
            elements.append(('h4', line[5:].strip()))
        elif line.startswith('> '):
            elements.append(('blockquote', line[2:].strip()))
        elif line.strip().startswith('- ') or line.strip().startswith('* '):
            indent_level = (len(line) - len(line.lstrip())) // 2
            elements.append(('list', (line.strip()[2:], indent_level)))
        elif re.match(r'^\s*\d+\.\s', line):
            indent_level = (len(line) - len(line.lstrip())) // 2
            text = re.sub(r'^\s*\d+\.\s*', '', line)
            elements.append(('list', (text, indent_level)))
        elif line.strip() in ['---', '***', '___']:
            elements.append(('hr', None))
        elif line.strip():
            para_lines = [line.strip()]
            j = i + 1
            while j < len(lines):
                next_line = lines[j]
                if (next_line.strip() and 
                    not next_line.startswith('#') and 
                    not next_line.startswith('```') and 
                    not next_line.strip().startswith('- ') and 
                    not next_line.strip().startswith('* ') and 
                    not next_line.startswith('> ') and 
                    '|' not in next_line and
                    not re.match(r'^\s*\d+\.\s', next_line)):
                    para_lines.append(next_line.strip())
                    j += 1
                else:
                    break
            
            elements.append(('paragraph', ' '.join(para_lines)))
            i = j - 1
        
        i += 1
    
    if in_table and table_headers and table_rows:
        elements.append(('table', (table_headers, table_rows)))
    
    return elements


def process_document(pdf, filepath):
    """Process a markdown document and add it to the PDF."""
    if not filepath.exists():
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    elements = parse_markdown(content)
    first_heading = True
    
    for elem_type, elem_data in elements:
        try:
            if elem_type == 'h1':
                if first_heading:
                    first_heading = False
                    continue  # Skip first H1 as we already have chapter title
                pdf.add_heading1(elem_data)
            elif elem_type == 'h2':
                pdf.add_heading2(elem_data)
            elif elem_type == 'h3':
                pdf.add_heading3(elem_data)
            elif elem_type == 'h4':
                pdf.add_heading4(elem_data)
            elif elem_type == 'paragraph':
                pdf.add_paragraph(elem_data)
            elif elem_type == 'code':
                pdf.add_code_block(elem_data)
            elif elem_type == 'list':
                text, level = elem_data
                pdf.add_list_item(text, level)
            elif elem_type == 'table':
                headers, rows = elem_data
                if headers and rows:
                    pdf.add_table(headers, rows)
            elif elem_type == 'blockquote':
                pdf.add_blockquote(elem_data)
            elif elem_type == 'hr':
                pdf.add_horizontal_rule()
        except Exception as e:
            pass  # Skip problematic elements
    
    return True


def main():
    """Main entry point."""
    print()
    print("=" * 70)
    print("  VayuReader Backend v2 - Complete Documentation Book Generator")
    print("=" * 70)
    print()
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Check docs directory
    if not DOCS_DIR.exists():
        print(f"Error: Documentation directory not found: {DOCS_DIR}")
        sys.exit(1)
    
    # Create PDF - single pass with proper link handling
    print("Creating PDF book with hyperlinked Table of Contents...")
    pdf = DocumentationBook()
    
    # Add cover page
    print("  Adding cover page...")
    pdf.cover_page()
    
    # Add placeholder for TOC (we'll know page count after processing)
    # Reserve 3 pages for TOC
    print("  Reserving space for Table of Contents...")
    toc_start_page = pdf.page_no() + 1
    for _ in range(3):
        pdf.add_page()
        pdf.set_font('DejaVu', 'I', 10)
        pdf.set_text_color(200, 200, 200)
        pdf.set_y(140)
        pdf.cell(0, 10, "(Table of Contents - will be generated)", align='C')
    
    # Process documents and collect TOC entries
    total_docs = sum(1 for d in DOCUMENT_STRUCTURE if 'file' in d)
    current = 0
    
    for item in DOCUMENT_STRUCTURE:
        if 'section' in item:
            # Part header
            print(f"\n  {item['section']}")
            pdf.add_part_header(item['section'])
        elif 'file' in item:
            current += 1
            filepath = DOCS_DIR / item['file']
            print(f"    [{current}/{total_docs}] {item['title']}...", end=" ")
            
            pdf.add_chapter_start(item['title'])
            
            if process_document(pdf, filepath):
                print("✓")
            else:
                print("✗ (not found)")
    
    # Now regenerate the entire PDF with proper TOC
    print("\n  Generating final PDF with clickable Table of Contents...")
    
    # Store collected TOC entries
    collected_toc = pdf.toc_entries.copy()
    
    # Create final PDF
    final_pdf = DocumentationBook()
    
    # Cover page
    final_pdf.cover_page()
    
    # Create all link destinations FIRST (before TOC)
    # We need to pre-create links so TOC can reference them
    link_map = {}  # title -> link
    for level, title, page_num, _ in collected_toc:
        link = final_pdf.add_link()
        link_map[title] = link
    
    # Now add TOC page with links
    final_pdf.add_page()
    
    # Title
    final_pdf.set_font('DejaVu', 'B', 24)
    final_pdf.set_text_color(26, 54, 93)
    final_pdf.cell(0, 15, "Table of Contents", align='C')
    final_pdf.ln(20)
    
    # Line
    final_pdf.set_draw_color(26, 54, 93)
    final_pdf.set_line_width(1)
    final_pdf.line(25, final_pdf.get_y(), 185, final_pdf.get_y())
    final_pdf.ln(10)
    
    # Calculate page offset (cover + toc pages vs original)
    # Original had cover(1) + 3 placeholder pages = 4 pages before content
    # New will have cover(1) + toc pages before content
    toc_page_count = 2  # Estimate 2 pages for TOC
    page_adjustment = toc_page_count - 3  # Adjust for placeholder difference
    
    # Render TOC entries
    for level, title, orig_page_num, _ in collected_toc:
        # Adjust page number
        page_num = orig_page_num + page_adjustment
        link = link_map.get(title)
        
        if level == 0:  # Part
            final_pdf.ln(5)
            final_pdf.set_font('DejaVu', 'B', 12)
            final_pdf.set_text_color(26, 54, 93)
            indent = 0
        elif level == 1:  # Chapter
            final_pdf.set_font('DejaVu', '', 10)
            final_pdf.set_text_color(49, 130, 206)  # Blue for clickable
            indent = 10
        else:
            continue
        
        final_pdf.set_x(25 + indent)
        
        title_display = title
        page_str = str(page_num)
        page_width = final_pdf.get_string_width(page_str)
        available_width = 160 - indent - page_width - 5
        
        if final_pdf.get_string_width(title_display) > available_width - 10:
            while final_pdf.get_string_width(title_display + "...") > available_width - 10 and len(title_display) > 10:
                title_display = title_display[:-1]
            title_display += "..."
        
        # Render with or without link
        if level == 1 and link:
            final_pdf.cell(final_pdf.get_string_width(title_display), 7, title_display, link=link)
            dots_width = available_width - final_pdf.get_string_width(title_display) - 10
            num_dots = max(1, int(dots_width / 2))
            final_pdf.set_text_color(180, 180, 180)
            final_pdf.cell(dots_width, 7, "." * num_dots, align='R')
            final_pdf.set_text_color(49, 130, 206)
            final_pdf.cell(page_width + 5, 7, page_str, align='R', link=link)
        else:
            final_pdf.cell(available_width - 10, 7, title_display)
            dots_width = available_width - final_pdf.get_string_width(title_display) - 10
            num_dots = max(1, int(dots_width / 2))
            final_pdf.set_text_color(180, 180, 180)
            final_pdf.cell(dots_width, 7, "." * num_dots, align='R')
            final_pdf.set_text_color(26, 54, 93)
            final_pdf.cell(page_width + 5, 7, page_str, align='R')
        
        final_pdf.ln()
    
    # Now add all content with proper link destinations
    for item in DOCUMENT_STRUCTURE:
        if 'section' in item:
            title = item['section']
            final_pdf.add_page()
            final_pdf.current_section = title
            
            # Set link destination
            if title in link_map:
                final_pdf.set_link(link_map[title])
            
            # Vertical centering
            final_pdf.set_y(100)
            
            # Part title
            final_pdf.set_font('DejaVu', 'B', 28)
            final_pdf.set_text_color(26, 54, 93)
            final_pdf.cell(0, 15, title, align='C')
            
            # Decorative line
            final_pdf.ln(15)
            final_pdf.set_draw_color(26, 54, 93)
            final_pdf.set_line_width(1.5)
            final_pdf.line(60, final_pdf.get_y(), 150, final_pdf.get_y())
            
        elif 'file' in item:
            title = item['title']
            filepath = DOCS_DIR / item['file']
            
            final_pdf.add_page()
            final_pdf.current_chapter = title
            
            # Set link destination
            if title in link_map:
                final_pdf.set_link(link_map[title])
            
            # Chapter title
            final_pdf.set_font('DejaVu', 'B', 22)
            final_pdf.set_text_color(26, 54, 93)
            final_pdf.multi_cell(0, 12, final_pdf.clean_text(title))
            
            # Underline
            final_pdf.set_draw_color(26, 54, 93)
            final_pdf.set_line_width(0.8)
            final_pdf.line(25, final_pdf.get_y() + 3, 185, final_pdf.get_y() + 3)
            final_pdf.ln(15)
            
            # Process document content
            process_document(final_pdf, filepath)
    
    # Save
    output_path = OUTPUT_DIR / OUTPUT_FILE
    final_pdf.output(str(output_path))
    
    file_size = output_path.stat().st_size / 1024
    if file_size > 1024:
        size_str = f"{file_size/1024:.1f} MB"
    else:
        size_str = f"{file_size:.0f} KB"
    
    print()
    print("=" * 70)
    print("  ✓ Complete Documentation Book Generated Successfully!")
    print("=" * 70)
    print()
    print(f"  Output: {output_path}")
    print(f"  Size:   {size_str}")
    print(f"  Pages:  {final_pdf.page_no()}")
    print()
    print("  ✓ Table of Contents is hyperlinked - click on chapter names to navigate!")
    print()


if __name__ == "__main__":
    main()

