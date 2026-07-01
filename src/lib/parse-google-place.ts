export type ParsedAddress = {
  line1: string
  city: string
  state: string
  postalCode: string
  country: string // ISO2 e.g. "US", "CA"
}

function getComponent(
  components: google.maps.places.PlaceResult['address_components'],
  type: string,
  name: 'long_name' | 'short_name' = 'long_name'
): string {
  const match = components?.find(c => c.types.includes(type))
  return match?.[name]?.trim() ?? ''
}

export function parseGooglePlace(place: google.maps.places.PlaceResult): ParsedAddress | null {
  const components = place.address_components
  if (!components?.length) return null

  const streetNumber = getComponent(components, 'street_number')
  const route = getComponent(components, 'route')
  const line1 =
    [streetNumber, route].filter(Boolean).join(' ').trim() ||
    place.formatted_address?.split(',')[0]?.trim() ||
    ''

  const city =
    getComponent(components, 'locality') ||
    getComponent(components, 'postal_town') ||
    getComponent(components, 'sublocality') ||
    getComponent(components, 'administrative_area_level_2')

  const state = getComponent(components, 'administrative_area_level_1', 'short_name')
  const postalCode = getComponent(components, 'postal_code')
  const country = getComponent(components, 'country', 'short_name')

  if (!line1 && !city && !postalCode) return null

  return { line1, city, state, postalCode, country }
}
