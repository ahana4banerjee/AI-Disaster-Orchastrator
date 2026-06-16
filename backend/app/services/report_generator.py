class ReportGenerator:
    @staticmethod
    def compile_markdown_report(simulation_data: dict) -> str:
        return f"# SITREP: {simulation_data.get('name')}\n\nSimulation metrics compiled."
        
    @staticmethod
    def generate_pdf_bytes(markdown_content: str) -> bytes:
        return b"%PDF-1.4 sample PDF bytes placeholder"
