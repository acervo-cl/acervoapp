function waitFor(cond, ms = 10000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (cond()) {
        clearInterval(iv);
        resolve();
      } else if (Date.now() - t0 > ms) {
        clearInterval(iv);
        reject(new Error('No se pudo cargar la librería (revisa tu conexión)'));
      }
    }, 80);
  });
}

let pickedFileName = '';
let pickedFile = null;
let pickedKind = null;
let pickedPdfText = '';

function kindFromExt(ext) {
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (ext === 'md') return 'md';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return 'txt';
}

const KIND_TYPE = { pdf: 'PDF', docx: 'Word', doc: 'Word', md: 'Apunte', txt: 'Apunte', image: 'Imagen' };

async function extractPdfToContent() {
  let txt = pickedPdfText || '';
  if (!txt && STATE.editingDocId) {
    const doc = DOCUMENTS.find((x) => x.id === STATE.editingDocId);
    if (doc) {
      if (doc.pdfText) {
        txt = doc.pdfText;
      } else if (doc.hasFile && doc.fileKind === 'pdf') {
        toast('Extrayendo texto del PDF…');
        try {
          if (!window.pdfjsLib) await waitFor(() => window.pdfjsLib);
          const blob = await getFileBlob(doc.id);
          if (blob) {
            const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i += 1) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              fullText += `${textContent.items.map((it) => it.str).join(' ')}\n`;
            }
            txt = fullText.trim();
          }
        } catch (e) {
          toast(`No se pudo leer el PDF: ${e.message}`, 'error');
          return;
        }
      }
    }
  }
  if (!txt) {
    toast('Primero carga un PDF (o abre un libro que tenga PDF)', 'error');
    return;
  }
  const cur = document.getElementById('fd-content').value.trim();
  if (cur && !confirm('Esto reemplazará el Contenido actual con el texto del PDF. ¿Continuar?')) return;
  document.getElementById('fd-content').value = txt;
  richLoad();
  toast('Texto del PDF extraído al Contenido', 'success');
}

async function onFilePick(e) {
  const file = e.target.files[0];
  if (!file) return;
  pickedFile = file;
  pickedFileName = file.name;
  pickedPdfText = '';
  const ext = file.name.split('.').pop().toLowerCase();
  pickedKind = kindFromExt(ext);
  document.getElementById('fd-file-name').textContent = `📎 ${file.name}`;
  if (!document.getElementById('fd-title').value.trim()) {
    document.getElementById('fd-title').value = file.name.replace(/\.[^.]+$/, '');
  }
  if (KIND_TYPE[pickedKind]) document.getElementById('fd-type').value = KIND_TYPE[pickedKind];

  try {
    if (pickedKind === 'txt' || pickedKind === 'md') {
      document.getElementById('fd-content').value = await file.text();
      richLoad();
      toast('Texto cargado', 'success');
    } else if (pickedKind === 'docx') {
      toast('Procesando Word…');
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      document.getElementById('fd-content').value = result.value || '';
      richLoad();
      toast('Word listo para leer', 'success');
    } else if (pickedKind === 'pdf') {
      toast('Cargando PDF…');
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let txt = '';
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        txt += `${textContent.items.map((it) => it.str).join(' ')}\n`;
      }
      pickedPdfText = txt.trim();
      document.getElementById('fd-content').value = '';
      richLoad();
      toast('PDF cargado', 'success');
    } else if (pickedKind === 'image') {
      pickedFile = await compressIfImage(pickedFile);
      pickedFileName = pickedFile.name;
      document.getElementById('fd-file-name').textContent = `📎 ${pickedFileName}`;
      toast('Imagen lista', 'success');
    } else if (pickedKind === 'doc') {
      toast('.doc antiguo: se guardará para descarga (sin previsualización)', '');
    }
  } catch (err) {
    toast(`No se pudo procesar el archivo: ${err.message}`, 'error');
  }
}
