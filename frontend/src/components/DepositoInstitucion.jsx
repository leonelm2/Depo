import MiStock from './MiStock'

/**
 * DepositoInstitucion se unifica con MiStock para ofrecer una única interfaz
 * integral y amigable para el directivo escolar.
 */
export default function DepositoInstitucion(props) {
  return <MiStock {...props} />
}
