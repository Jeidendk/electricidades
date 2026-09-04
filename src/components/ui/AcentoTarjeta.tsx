/**
 * Franja de color institucional en el borde superior de una tarjeta.
 *
 * Estaba copiada a mano en siete pantallas con la misma cadena de clases larga, así que
 * cualquier ajuste del degradado obligaba a buscarlas todas.
 *
 * La tarjeta que la contiene necesita `relative` y `overflow-hidden`: lo primero para que la
 * franja se posicione contra ella, lo segundo para que no se salga de las esquinas redondeadas.
 */
export const AcentoTarjeta = () => (
  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-espoch-yellow via-orange-400 to-espoch-red opacity-90" />
);
