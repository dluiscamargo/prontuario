import requests
import logging

logger = logging.getLogger(__name__)

class Nominatim:
    @staticmethod
    def get_coords(address):
        try:
            headers = {
                'User-Agent': 'ProntuarioMedicoApp/1.0 (seu-email@exemplo.com)'  # Adicionado User-Agent
            }
            url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json"
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data:
                lat = data[0].get('lat')
                lon = data[0].get('lon')
                logger.info(f"Coordinates found for address '{address}': lat={lat}, lon={lon}")
                return lat, lon
        except requests.RequestException as e:
            logger.error(f"Error fetching coordinates for address '{address}': {e}")
        logger.warning(f"No coordinates found for address '{address}'")
        return None, None

def get_coordinates_for_patient(patient):
    address_parts = [
        patient.address.street,
        patient.address.number,
        patient.address.city,
        patient.address.state,
    ]
    full_address = ", ".join(filter(None, address_parts))
    
    if full_address:
        logger.info(f"Getting coordinates for patient {patient.id} with address: {full_address}")
        lat, lon = Nominatim.get_coords(full_address)
        if lat and lon:
            patient.address.latitude = lat
            patient.address.longitude = lon
            patient.address.save()
            logger.info(f"Saved coordinates for patient {patient.id}")
