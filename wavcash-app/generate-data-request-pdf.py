"""Generate the WavCash Data Request Form PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Flowable,
)
from reportlab.lib.colors import black

OUTPUT = "public/data-request-form.pdf"

PAGE_W, PAGE_H = letter
MARGIN = 1 * inch
CONTENT_W = PAGE_W - 2 * MARGIN  # usable width

# ── Styles ──────────────────────────────────────────────────────────

style_title = ParagraphStyle(
    "Title",
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=18,
    alignment=TA_CENTER,
    spaceAfter=20,
)

style_section = ParagraphStyle(
    "Section",
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=16,
    spaceBefore=22,
    spaceAfter=8,
    textColor=black,
)

style_body = ParagraphStyle(
    "Body",
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    spaceAfter=6,
)

style_italic = ParagraphStyle(
    "Italic",
    fontName="Helvetica-Oblique",
    fontSize=10,
    leading=14,
    spaceAfter=8,
)

style_field = ParagraphStyle(
    "Field",
    fontName="Helvetica",
    fontSize=10,
    leading=18,
    spaceAfter=4,
)

style_checkbox_desc = ParagraphStyle(
    "CheckboxDesc",
    fontName="Helvetica",
    fontSize=9.5,
    leading=13,
    leftIndent=22,
    spaceAfter=10,
    textColor=black,
)

style_bullet = ParagraphStyle(
    "Bullet",
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    leftIndent=22,
    bulletIndent=10,
    spaceAfter=4,
)


# ── Custom flowable: checkbox + bold label ──────────────────────────

class CheckboxLabel(Flowable):
    """Draw an empty checkbox square followed by bold text."""

    def __init__(self, text: str, box_size: float = 9, font_size: float = 10):
        super().__init__()
        self.text = text
        self.box_size = box_size
        self.font_size = font_size
        self.height = max(box_size, font_size) + 4

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return (availWidth, self.height)

    def draw(self):
        c = self.canv
        bs = self.box_size
        y_box = (self.height - bs) / 2
        # Empty checkbox
        c.setStrokeColor(black)
        c.setLineWidth(0.8)
        c.rect(0, y_box, bs, bs, stroke=1, fill=0)
        # Bold label text
        c.setFont("Helvetica-Bold", self.font_size)
        c.drawString(bs + 8, y_box + 1.5, self.text)


# ── Custom flowable: underline that fits one line ───────────────────

class FieldLine(Flowable):
    """Draw 'Label: ____________' that never wraps."""

    def __init__(self, label: str, font_size: float = 10):
        super().__init__()
        self.label = label
        self.font_size = font_size
        self.height = 20

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return (availWidth, self.height)

    def draw(self):
        c = self.canv
        c.setFont("Helvetica", self.font_size)
        label_w = c.stringWidth(self.label, "Helvetica", self.font_size)
        c.drawString(0, 5, self.label)
        # Draw underline from end of label to near edge, with 8pt gap
        line_start = label_w + 8
        line_end = self.width - 4
        if line_end > line_start:
            c.setLineWidth(0.5)
            c.line(line_start, 3, line_end, 3)


class BlankLine(Flowable):
    """Draw a single underline spanning the content width."""

    def __init__(self):
        super().__init__()
        self.height = 18

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return (availWidth, self.height)

    def draw(self):
        c = self.canv
        c.setLineWidth(0.5)
        c.line(0, 3, self.width - 4, 3)


# ── Build ───────────────────────────────────────────────────────────

def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
    )

    story: list = []

    # Title
    story.append(Paragraph("WavCash Data Request Form", style_title))

    # ── Section 1 ───────────────────────────────────────────────────
    story.append(Paragraph("SECTION 1: YOUR INFORMATION", style_section))
    story.append(FieldLine("Full Name:"))
    story.append(FieldLine("Email Address (must match your registered account email):"))
    story.append(FieldLine("Date of Request:"))

    # ── Section 2 ───────────────────────────────────────────────────
    story.append(Paragraph("SECTION 2: TYPE OF REQUEST", style_section))
    story.append(
        Paragraph(
            "Select all that apply by marking an X in the box.",
            style_italic,
        )
    )

    items = [
        (
            "Access \u2014 I want a copy of my data",
            "I am requesting a copy of the personal information WavCash holds about me, "
            "including what categories are stored, how they are used, and who they have been shared with.",
        ),
        (
            "Deletion \u2014 I want my data deleted",
            "I am requesting that WavCash delete the personal information it holds about me. "
            "I understand that certain data may be retained where required by law (for example, "
            "signed split sheet agreements that must be retained for their legal enforceability period). "
            "I am requesting that all other personal information, including my contact details and account data, be deleted.",
        ),
        (
            "Correction \u2014 I want to correct inaccurate data",
            "I am requesting that WavCash correct personal information it holds about me that is inaccurate "
            "or incomplete. Please describe what needs to be corrected in Section 3.",
        ),
        (
            "Portability \u2014 I want an export of my data",
            "I am requesting a machine-readable export of the personal information I have provided to WavCash "
            "(JSON or CSV format), for the purpose of transferring it to another service.",
        ),
        (
            "Opt Out of Marketing \u2014 I want to stop receiving marketing emails",
            "I am requesting that WavCash stop sending me marketing and promotional emails. "
            "Note: transactional emails related to agreements you are a party to (invitations, signing "
            "confirmations, reminders) are not marketing and will continue unless you delete your account.",
        ),
        (
            "Object to Processing \u2014 I want to restrict how my data is used",
            "I am requesting that WavCash restrict or stop processing my personal information for a specific "
            "purpose. Please describe the processing you wish to object to in Section 3.",
        ),
    ]

    for label, desc in items:
        story.append(CheckboxLabel(label))
        story.append(Paragraph(desc, style_checkbox_desc))

    # ── Section 3 ───────────────────────────────────────────────────
    story.append(Paragraph("SECTION 3: ADDITIONAL DETAILS", style_section))
    story.append(
        Paragraph(
            "Required for Correction and Object to Processing requests. Optional for all others.",
            style_italic,
        )
    )
    story.append(
        Paragraph(
            "Please provide any details that will help us process your request accurately. "
            "For example: what information is incorrect and what the correct version should be, "
            "or which specific processing activity you are objecting to and why.",
            style_body,
        )
    )
    story.append(Spacer(1, 4))
    story.append(BlankLine())
    story.append(BlankLine())
    story.append(BlankLine())

    # ── Section 4 ───────────────────────────────────────────────────
    story.append(Paragraph("SECTION 4: DECLARATION", style_section))
    story.append(
        Paragraph(
            "By submitting this form from your registered email address, you confirm that:",
            style_body,
        )
    )
    bullets = [
        "You are the person to whom the data relates, or you are authorized to act on their behalf",
        "The information provided above is accurate to the best of your knowledge",
        "You understand that WavCash may need to ask a clarifying question before completing your request",
    ]
    for b in bullets:
        story.append(
            Paragraph(
                f"\u2022  {b}",
                style_bullet,
            )
        )

    doc.build(story)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    build()
