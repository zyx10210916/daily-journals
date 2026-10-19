from pathlib import Path
from zipfile import ZipFile, ZIP_STORED
import hashlib
import json
from xml.etree import ElementTree as ET
from posixpath import dirname, normpath, join

root=Path(__file__).resolve().parents[1]/'public/editions'
catalog=json.loads((root/'catalog.json').read_text())
namespaces={'opf':'http://www.idpf.org/2007/opf','dc':'http://purl.org/dc/elements/1.1/','x':'http://www.w3.org/1999/xhtml'}
for edition in catalog['editions']:
    file=root/edition['file']
    assert hashlib.sha256(file.read_bytes()).hexdigest()==edition['sha256']
    with ZipFile(file) as archive:
        files=archive.namelist()
        assert files[0]=='mimetype'
        assert archive.getinfo('mimetype').compress_type==ZIP_STORED
        assert archive.read('mimetype')==b'application/epub+zip'
        package=ET.fromstring(archive.read('EPUB/package.opf'))
        assert package.attrib['version']=='3.0'
        assert package.find('opf:metadata/dc:language',namespaces).text=='zh-CN'
        manifest={item.attrib['id']:item.attrib['href'] for item in package.findall('opf:manifest/opf:item',namespaces)}
        assert 'nav' in manifest
        for href in manifest.values(): assert f'EPUB/{href}' in files
        for reference in package.findall('opf:spine/opf:itemref',namespaces): assert reference.attrib['idref'] in manifest
        chapters=[name for name in files if name.startswith('EPUB/chapter-')]
        assert len(chapters)==edition['chapter_count']
        for name in files:
            if name.endswith(('.xhtml','.opf','.xml')):
                xml=ET.fromstring(archive.read(name))
                for element in xml.iter():
                    href=element.attrib.get('href','')
                    if href and not href.startswith(('https://','http://','#')):
                        assert normpath(join(dirname(name),href.split('#')[0])) in files, f'Broken EPUB link {name}: {href}'
        assert archive.testzip() is None
print(f'Verified {len(catalog["editions"])} EPUB 3 packages: XML, manifest, spine, navigation, local links, chapter counts and checksums.')
