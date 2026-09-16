import sys
import pypdfium2 as pdfium

source, page_number, output = sys.argv[1:]
with pdfium.PdfDocument(source) as pdf:
    page = pdf[int(page_number) - 1]
    width, height = page.get_size()
    scale = min(1600 / width, 2400 / height, 2.5)
    bitmap = page.render(scale=scale)
    image = bitmap.to_pil()
    image.save(output, format='PNG')
    image.close()
    bitmap.close()
    page.close()
