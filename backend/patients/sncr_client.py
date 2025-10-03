import requests
import logging
import xml.etree.ElementTree as ET
from django.conf import settings
import hashlib

logger = logging.getLogger(__name__)

SNCR_ENDPOINT = settings.SNCR_ENDPOINT
SNCR_TIMEOUT = settings.SNCR_TIMEOUT

def enviar_receita_para_sncr(prescription_id, metadata):
    """
    Envia os metadados da receita ao SNCR para obter o número regulatório.

    Args:
        prescription_id: ID da prescrição para logs.
        metadata: Dicionário com os campos requeridos pelo SNCR 
                  (cpf, crm, data, pdf_hash, etc.).
    
    Returns:
        Um dicionário com a resposta da API (numero, status, etc.).
    
    Raises:
        requests.exceptions.RequestException: Em caso de erro de comunicação.
    """
    # Exemplo de payload XML fictício. Adapte conforme a especificação oficial.
    xml_payload = f"""
    <Request>
      <PacienteCPF>{metadata.get('patient_cpf', '')}</PacienteCPF>
      <MedicoCRM>{metadata.get('doctor_crm', '')}</MedicoCRM>
      <DataEmissao>{metadata.get('issue_date', '')}</DataEmissao>
      <HashPDF>{metadata.get('pdf_hash', '')}</HashPDF>
      <TipoReceita>{metadata.get('prescription_type', '')}</TipoReceita>
    </Request>
    """.strip()

    try:
        # Caminhos para os certificados vêm do settings.py
        cert_tuple = (settings.SNCR_CERT_PEM_PATH, settings.SNCR_KEY_PEM_PATH)

        headers = {
            "Content-Type": "application/xml; charset=utf-8",
            "Accept": "application/xml"
        }

        logger.info(f"Enviando requisição para SNCR para a receita {prescription_id}...")
        
        response = requests.post(
            SNCR_ENDPOINT,
            data=xml_payload.encode('utf-8'),
            headers=headers,
            cert=cert_tuple,
            timeout=SNCR_TIMEOUT,
            verify=settings.SNCR_VERIFY_SSL
        )

        logger.info(f"SNCR respondeu com status {response.status_code} para a receita {prescription_id}")
        response.raise_for_status()

        # Parse da resposta XML (adapte conforme a resposta real)
        root = ET.fromstring(response.content)
        numero = root.findtext('.//Numero')
        status = root.findtext('.//Status')
        message = root.findtext('.//Mensagem')

        return {
            "numero": numero,
            "status": status,
            "message": message,
            "raw": response.text,
        }

    except requests.exceptions.RequestException as e:
        logger.exception(f"Erro ao comunicar com SNCR para a receita {prescription_id}: {e}")
        raise

def calcular_hash_pdf(pdf_bytes):
    """
    Calcula o hash SHA-256 de um conteúdo de PDF.
    """
    return hashlib.sha256(pdf_bytes).hexdigest()
