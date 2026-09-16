"""Extract PDF page text; no document content is executed or modified."""
import json, sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
if reader.is_encrypted:
    raise ValueError('Password-protected PDF is not supported')
if len(reader.pages) > 2000:
    raise ValueError('PDF has more than 2000 pages')
pages = [(page.extract_text() or '')[:100000] for page in reader.pages]
sys.stdout.buffer.write(json.dumps({'pages': pages}, ensure_ascii=False).encode('utf-8'))
