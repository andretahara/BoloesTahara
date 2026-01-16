import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
        return NextResponse.json({ authorized: false, message: 'Email é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()
    const emailLower = email.toLowerCase()

    // Buscar todos os emails/domínios autorizados ativos
    const { data: autorizados, error } = await supabase
        .from('emails_autorizados')
        .select('tipo, valor')
        .eq('ativo', true)

    if (error) {
        console.error('Erro ao buscar emails autorizados:', error)
        // Em caso de erro no banco, permitir apenas @experian.com como fallback
        const isExperian = emailLower.endsWith('@experian.com')
        return NextResponse.json({
            authorized: isExperian,
            message: isExperian ? 'Email autorizado' : 'Email não autorizado'
        })
    }

    // Se não há registros na tabela, usar fallback
    if (!autorizados || autorizados.length === 0) {
        const isExperian = emailLower.endsWith('@experian.com')
        return NextResponse.json({
            authorized: isExperian,
            message: isExperian ? 'Email autorizado' : 'Apenas emails @experian.com são permitidos'
        })
    }

    // Verificar se o email está autorizado
    const isAuthorized = autorizados.some(item => {
        if (item.tipo === 'email') {
            return emailLower === item.valor.toLowerCase()
        } else if (item.tipo === 'dominio') {
            return emailLower.endsWith(item.valor.toLowerCase())
        }
        return false
    })

    return NextResponse.json({
        authorized: isAuthorized,
        message: isAuthorized ? 'Email autorizado' : 'Este email não está autorizado para registro'
    })
}
