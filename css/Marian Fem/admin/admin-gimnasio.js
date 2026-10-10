import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ciorlilsipudyqhuzxzh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VFhlc6La51QGJT-_qVu19Q_6hqlXWof'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const tablaTurnos = document.getElementById('tabla-turnos-gimnasio')

async function verificarSesionAdmin() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        window.location.href = 'admin-login.html'
    }
}

verificarSesionAdmin()

window.cerrarSesionAdmin = async function() {
    await supabase.auth.signOut()
    window.location.href = 'admin-login.html'
}

async function cargarClasesSupabase() {
    try {
        const { data, error } = await supabase
            .from('gimnasio_clases')
            .select('*')
            .order('horario', { ascending: true })

        if (error) throw error

        renderizarTabla(data)
    } catch (err) {
        console.error("Error al conectar con Supabase:", err.message)
    }
}

function renderizarTabla(clases) {
    if (!tablaTurnos) return
    tablaTurnos.innerHTML = ""

    if (!clases || clases.length === 0) {
        tablaTurnos.innerHTML = `<tr><td colspan="4" class="py-4 px-3 text-center text-zinc-500">No hay clases registradas en Supabase.</td></tr>`
        return
    }

    clases.forEach((clase) => {
        const tr = document.createElement('tr')
        tr.className = "hover:bg-zinc-800/50 transition"

        const tdHora = document.createElement('td')
        tdHora.className = "py-3 px-3 font-bold text-white"
        tdHora.textContent = clase.horario

        const tdDisc = document.createElement('td')
        tdDisc.className = "py-3 px-3 text-zinc-300"
        tdDisc.innerHTML = `${clase.nombre}<br><span class="text-xs text-pink-500 font-normal">${clase.categoria || 'Entrenamiento'}</span>`

        const tdCupos = document.createElement('td')
        tdCupos.className = "py-3 px-3"
        const span = document.createElement('span')
        const libres = clase.totales - clase.ocupados

        if (libres <= 0) {
            span.className = "bg-pink-500/10 text-pink-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-pink-500/20"
            span.textContent = "Llena (Cupo Máximo)"
        } else {
            span.className = "bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20"
            span.textContent = `${libres} lugares libres`
        }
        tdCupos.appendChild(span)

        const tdAccion = document.createElement('td')
        tdAccion.className = "py-3 px-3 text-right"
        const btn = document.createElement('button')
        btn.className = "text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-200 font-semibold transition"
        btn.textContent = "Ver Asistencia"
        btn.onclick = () => alert(`Gestionando asistencia para: ${clase.nombre} a las ${clase.horario}`)
        tdAccion.appendChild(btn)

        tr.appendChild(tdHora)
        tr.appendChild(tdDisc)
        tr.appendChild(tdCupos)
        tr.appendChild(tdAccion)

        tablaTurnos.appendChild(tr)
    })
}

document.addEventListener("DOMContentLoaded", () => {
    cargarClasesSupabase()
})