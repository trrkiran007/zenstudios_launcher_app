/*
 * Who made the software, as opposed to who is using it.
 *
 * Everything the business supplies about itself — name, logo, colour, address,
 * tax identifiers — lives in Settings and is theirs to edit. These two are
 * neither: they identify the application, they are the same on every install,
 * and the user interface shows them read-only.
 */
export const PRODUCT_NAME = 'BOS';
export const VENDOR = 'BlueMount Software';

/** The attribution line shown in the sidebar and on the Settings screen. */
export function attribution(version?: string | null) {
  return version ? `A product of ${VENDOR} · v${version}` : `A product of ${VENDOR}`;
}
