// Lista de emails autorizados como administradores
// Para adicionar mais admins, basta adicionar o email nesta lista

export const AUTHORIZED_ADMINS = [
    'andretahara@gmail.com',
    'test.user@experian.com', // Temporário para testes
]

export function isAdmin(email: string | undefined): boolean {
    if (!email) return false
    return AUTHORIZED_ADMINS.includes(email.toLowerCase())
}
