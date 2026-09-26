/**
 * The merchandise card shape shared by the shop listing and its card
 * component. (This file used to hold mockup demo data for the Designers
 * Associates and Merchandise pages; both now read the database, so only the
 * type is left.)
 */

export type ProductCard = {
  slug: string
  name: string
  brand: string
  image: string
  price: number
  mrp: number
  rating: number
  reviews: number
  city: string
  discount: number
  /** Size or weight options, when the product is sold in more than one. */
  variants?: string[]
}
