/**
 * Builds a .vsix package manually without needing @vscode/vsce.
 * A .vsix is a zip file containing:
 *   - [Content_Types].xml
 *   - extension.vsixmanifest
 *   - extension/ (the actual extension files)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const VSIX_NAME = `${pkg.name}-${pkg.version}.vsix`;
const BUILD_DIR = path.join(ROOT, '.vsix-build');
const EXT_DIR = path.join(BUILD_DIR, 'extension');

function clean() {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  }
  fs.mkdirSync(EXT_DIR, { recursive: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildExtensionFolder() {
  // Copy compiled output
  copyDir(path.join(ROOT, 'out'), path.join(EXT_DIR, 'out'));

  // Copy media (sounds)
  copyDir(path.join(ROOT, 'media'), path.join(EXT_DIR, 'media'));

  // Copy package.json
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(EXT_DIR, 'package.json'));

  // Copy README
  if (fs.existsSync(path.join(ROOT, 'README.md'))) {
    fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(EXT_DIR, 'README.md'));
  }

  // Copy node_modules/play-sound (runtime dependency)
  const playSoundSrc = path.join(ROOT, 'node_modules', 'play-sound');
  if (fs.existsSync(playSoundSrc)) {
    copyDir(playSoundSrc, path.join(EXT_DIR, 'node_modules', 'play-sound'));
  }
}

function writeContentTypes() {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".js.map" ContentType="application/json"/>
  <Default Extension=".wav" ContentType="audio/wav"/>
  <Default Extension=".mp3" ContentType="audio/mpeg"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>`;
  fs.writeFileSync(path.join(BUILD_DIR, '[Content_Types].xml'), xml);
}

function writeManifest() {
  const id = `${pkg.publisher}.${pkg.name}`;
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${pkg.name}" Version="${pkg.version}" Publisher="${pkg.publisher}"/>
    <DisplayName>${pkg.displayName}</DisplayName>
    <Description xml:space="preserve">${pkg.description}</Description>
    <Categories>${(pkg.categories || ['Other']).join(',')}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${pkg.engines.vscode}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/>
  </Assets>
</PackageManifest>`;
  fs.writeFileSync(path.join(BUILD_DIR, 'extension.vsixmanifest'), xml);
}

function createZip() {
  const vsixPath = path.join(ROOT, VSIX_NAME);
  if (fs.existsSync(vsixPath)) {
    fs.unlinkSync(vsixPath);
  }
  execSync(`cd "${BUILD_DIR}" && zip -r "${vsixPath}" . -x ".*"`, { stdio: 'inherit' });
  console.log(`\nCreated: ${vsixPath}`);
  console.log(`Size: ${(fs.statSync(vsixPath).size / 1024).toFixed(1)} KB`);
}

function cleanup() {
  fs.rmSync(BUILD_DIR, { recursive: true });
}

// Run
clean();
buildExtensionFolder();
writeContentTypes();
writeManifest();
createZip();
cleanup();

console.log(`\nInstall with: cursor --install-extension ${VSIX_NAME}`);
console.log('Or: Cmd+Shift+P → "Extensions: Install from VSIX..."');
