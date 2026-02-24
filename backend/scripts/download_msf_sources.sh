#!/bin/bash
# scripts/download_msf_sources.sh
# Downloads all confirmed-working MSF source documents.
# Run once from the project root.

set -e

mkdir -p data/raw
cd data/raw

echo "=== Downloading MSF Clinical Guidelines 2021 ==="
curl -L --progress-bar \
  "https://jrc-eh.net/wp-content/uploads/2021/06/MSF_ClinicalGuidelinesE.pdf" \
  -o msf_clinical_guidelines_2021.pdf
echo "✓ msf_clinical_guidelines_2021.pdf"

echo "=== Downloading MSF NCD Clinical Guidelines 2025 ==="
curl -L --progress-bar \
  "https://www.msf.org.za/sites/default/files/2025-01/Guideline_NCDCinicalGuidelines_MSFInt_2025_EN.pdf" \
  -o msf_ncd_guidelines_2025.pdf
echo "✓ msf_ncd_guidelines_2025.pdf"

echo "=== Downloading MSF Kala-Azar Fact Sheet ==="
curl -L --progress-bar \
  "https://msfaccess.org/sites/default/files/MSF_assets/NegDis/Docs/KalaAzar_FactSheet_ENG_2011_Final.pdf" \
  -o msf_kala_azar_factsheet.pdf
echo "✓ msf_kala_azar_factsheet.pdf"

echo ""
echo "=== All files downloaded ==="
ls -lh *.pdf
echo ""
echo "Next: run python scripts/scrape_msf_portal.py to fetch live portal pages"
echo "Then: run python scripts/build_rag.py to index everything"
