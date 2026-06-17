import csv
import os
from typing import Generator, List, Dict

class CSVLoader:
    """
    Memory-efficient CSV chunk reader.
    Streams rows from big datasets in batches to prevent RAM exhaustion.
    """
    def __init__(self, file_path: str, chunk_size: int = 1000):
        self.file_path = file_path
        self.chunk_size = chunk_size

        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"CSV file not found at path: {self.file_path}")

    def read_chunks(self) -> Generator[List[Dict[str, str]], None, None]:
        """
        Generator yielding lists of dict rows.
        Automatically resolves UTF-8 BOM encoding markers and strips spaces.
        """
        with open(self.file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            chunk = []
            for row in reader:
                # Filter out null keys and clean spaces
                cleaned_row = {
                    key.strip(): val.strip() 
                    for key, val in row.items() 
                    if key is not None
                }
                chunk.append(cleaned_row)
                
                if len(chunk) >= self.chunk_size:
                    yield chunk
                    chunk = []
            
            # Yield remaining records
            if chunk:
                yield chunk
