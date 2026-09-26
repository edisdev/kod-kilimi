import cityNames from '../../data/cities.json'
import { CityCatalog } from '#domain/CityCatalog'

/** 81 il. Tek doğruluk kaynağı `data/cities.json`. */
export const cityCatalog = new CityCatalog(cityNames as string[])
