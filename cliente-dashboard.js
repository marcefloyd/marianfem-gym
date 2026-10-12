import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ciorlilsipudyqhuzxzh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VFhlc6La51QGJT-_qVu19Q_6hqlXWof'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const tablaClasesCliente = document.getElementById('tabla-clases-cliente')
const userEmailSpan = document.getElementById('user-email')
const userNombreDisplay = document.getElementById('user-nombre-display')
const headerTituloVista = document.getElementById('header-titulo-vista')

let clientaidActual = null

// 1. VERIFICACIÓN DE SESIÓN CLIENTA
async function verificarSesionCliente() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        window.location.href = 'admin-login.html'
    } else {
        userEmailSpan.textContent = session.user.email
        await cargarDatosCliente(session.user.id)
        cargarDatosYClases()
    }
}

verificarSesionCliente()

// 2. CIERRE DE SESIÓN
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion')
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
        await supabase.auth.signOut()
        window.location.href = 'admin-login.html'
    })
}

// 3. CARGAR DATOS DE LA CLIENTA
async function cargarDatosCliente(userId) {
    try {
        const { data } = await supabase
            .from('gimnasio_clientas')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (data) {
            clientaidActual = String(data.id) // Guardar como texto para evitar errores de tipo
            userNombreDisplay.textContent = data.nombre
            const contenedorFicha = document.getElementById('contenedor-ficha-medica')
            if (contenedorFicha) {
                contenedorFicha.innerHTML = `
                    <p class="font-bold text-white text-sm mb-1">${data.nombre}</p>
                    <p class="text-pink-400 mb-2">DNI: ${data.dni || 'No especificado'} | Tel: ${data.telefono}</p>
                    <p class="text-zinc-300"><strong class="text-pink-400">Observaciones Físicas:</strong> ${data.ficha_medica || 'Sin observaciones registradas.'}</p>
                `
            }
        }
    } catch (e) {
        console.error("Error al cargar perfil de clienta:", e)
    }
}

async function cargarDatosYClases() {
    await cargarClasesCliente()
    renderizarCalendarioMensual()
}

// 4. CONTROL DE VISTAS (Pestañas Izquierdas)
const navClases = document.getElementById('nav-clases')
const navPromos = document.getElementById('nav-promos')
const navFicha = document.getElementById('nav-ficha')
const navPlan = document.getElementById('nav-plan')

const viewClases = document.getElementById('view-clases')
const viewPromos = document.getElementById('view-promos')
const viewFicha = document.getElementById('view-ficha')
const viewPlan = document.getElementById('view-plan')

function cambiarVistaCliente(vista) {
    if (viewClases) viewClases.classList.add('hidden')
    if (viewPromos) viewPromos.classList.add('hidden')
    if (viewFicha) viewFicha.classList.add('hidden')
    if (viewPlan) viewPlan.classList.add('hidden')

    if (navClases) navClases.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition"
    if (navPromos) navPromos.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition"
    if (navFicha) navFicha.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition"
    if (navPlan) navPlan.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition"

    if (vista === 'clases') {
        if (viewClases) viewClases.classList.remove('hidden')
        if (navClases) navClases.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
        if (headerTituloVista) headerTituloVista.textContent = "Elegir Clases y Turnos"
    } else if (vista === 'promos') {
        if (viewPromos) viewPromos.classList.remove('hidden')
        if (navPromos) navPromos.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
        if (headerTituloVista) headerTituloVista.textContent = "Promociones y Avisos"
    } else if (vista === 'ficha') {
        if (viewFicha) viewFicha.classList.remove('hidden')
        if (navFicha) navFicha.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
        if (headerTituloVista) headerTituloVista.textContent = "Mi Ficha Médica"
    } else if (vista === 'plan') {
        if (viewPlan) viewPlan.classList.remove('hidden')
        if (navPlan) navPlan.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
        if (headerTituloVista) headerTituloVista.textContent = "Actualizar Plan / Pagos"
    }
}

if (navClases) navClases.addEventListener('click', (e) => { e.preventDefault(); cambiarVistaCliente('clases'); })
if (navPromos) navPromos.addEventListener('click', (e) => { e.preventDefault(); cambiarVistaCliente('promos'); })
if (navFicha) navFicha.addEventListener('click', (e) => { e.preventDefault(); cambiarVistaCliente('ficha'); })
if (navPlan) navPlan.addEventListener('click', (e) => { e.preventDefault(); cambiarVistaCliente('plan'); })

// 5. CARGAR CLASES Y ESTADO DE RESERVAS
async function cargarClasesCliente() {
    try {
        const { data: clases, error } = await supabase
            .from('gimnasio_clases')
            .select('*')
            .order('fecha', { ascending: true })

        if (error) throw error

        // Buscar reservas de la clienta actual
        let misReservas = []
        if (clientaidActual) {
            const { data: res } = await supabase
                .from('gimnasio_reservas')
                .select('*')
                .eq('clienta_id', clientaidActual)
            if (res) misReservas = res
        }

        renderizarTablaCliente(clases, misReservas)
    } catch (err) {
        console.error("Error al cargar clases:", err.message)
        if (tablaClasesCliente) {
            tablaClasesCliente.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-pink-500">Error al conectar con la base de datos.</td></tr>`
        }
    }
}

function renderizarTablaCliente(clases, misReservas) {
    if (!tablaClasesCliente) return
    tablaClasesCliente.innerHTML = ""

    if (!clases || clases.length === 0) {
        tablaClasesCliente.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-zinc-500 italic">No hay clases programadas en este momento.</td></tr>`
        return
    }

    clases.forEach((clase) => {
        const tr = document.createElement('tr')
        tr.className = "hover:bg-zinc-800/50 transition"

        const tdFecha = document.createElement('td')
        tdFecha.className = "py-3 px-3 font-bold text-white"
        tdFecha.innerHTML = `${clase.fecha || 'Sin fecha'} <br><span class="text-xs text-pink-500 font-normal">${clase.horario} hs</span>`

        const tdDisc = document.createElement('td')
        tdDisc.className = "py-3 px-3 text-zinc-300"
        tdDisc.innerHTML = `${clase.nombre}<br><span class="text-xs text-zinc-500 font-normal">Prof: Marian | Duración: 50 min</span>`

        const tdCupos = document.createElement('td')
        tdCupos.className = "py-3 px-3"
        const span = document.createElement('span')
        const ocupados = clase.ocupados || 0
        const libres = clase.totales - ocupados

        if (libres <= 0) {
            span.className = "bg-pink-500/10 text-pink-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-pink-500/20"
            span.textContent = "Completa (Sin cupo)"
        } else {
            span.className = "bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20"
            span.textContent = `${libres} lugares libres`
        }
        tdCupos.appendChild(span)

        const tdAccion = document.createElement('td')
        tdAccion.className = "py-3 px-3 text-right"
        const btn = document.createElement('button')

        const reservaExistente = misReservas.find(r => r.clase_id === clase.id)

        if (reservaExistente) {
            // Botón para cancelar reserva
            btn.className = "text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg font-semibold transition"
            btn.textContent = "❌ Cancelar Reserva"
            btn.onclick = () => cancelarReserva(reservaExistente.id, clase.id, ocupados, clase.nombre)
        } else if (libres <= 0) {
            btn.className = "text-xs bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded-lg font-semibold cursor-not-allowed"
            btn.textContent = "Sin cupo"
            btn.disabled = true
        } else {
            // Botón para reservar
            btn.className = "text-xs bg-pink-600 hover:bg-pink-500 px-3 py-1.5 rounded-lg text-white font-semibold transition shadow-sm"
            btn.textContent = "Reservar Turno"
            btn.onclick = () => reservarTurno(clase.id, clase.nombre, clase.horario, ocupados)
        }

        tdAccion.appendChild(btn)
        tr.appendChild(tdFecha)
        tr.appendChild(tdDisc)
        tr.appendChild(tdCupos)
        tr.appendChild(tdAccion)

        tablaClasesCliente.appendChild(tr)
    })
}

// 6. FUNCIONES DE RESERVA Y CANCELACIÓN
window.reservarTurno = async function(claseId, nombreClase, horarioClase, ocupadosActuales) {
    if (!clientaidActual) {
        alert("Error: No se encontró el perfil de la clienta.")
        return
    }

    const confirmar = confirm(`¿Confirmar reserva para la clase de "${nombreClase}" a las ${horarioClase} hs?`)
    if (!confirmar) return

    try {
        const { error: errorReserva } = await supabase
            .from('gimnasio_reservas')
            .insert([{ clase_id: claseId, clienta_id: clientaidActual }])

        if (errorReserva) throw errorReserva

        const { error: errorClase } = await supabase
            .from('gimnasio_clases')
            .update({ ocupados: ocupadosActuales + 1 })
            .eq('id', claseId)

        if (errorClase) throw errorClase

        alert(`¡Turno reservado con éxito para ${nombreClase}!`)
        cargarDatosYClases()
    } catch (err) {
        alert("Error al reservar el turno: " + err.message)
    }
}

window.cancelarReserva = async function(reservaId, claseId, ocupadosActuales, nombreClase) {
    const confirmar = confirm(`¿Deseas cancelar tu reserva para la clase de "${nombreClase}"?`)
    if (!confirmar) return

    try {
        const { error: errorReserva } = await supabase
            .from('gimnasio_reservas')
            .delete()
            .eq('id', reservaId)

        if (errorReserva) throw errorReserva

        const nuevoOcupados = Math.max(0, ocupadosActuales - 1)
        const { error: errorClase } = await supabase
            .from('gimnasio_clases')
            .update({ ocupados: nuevoOcupados })
            .eq('id', claseId)

        if (errorClase) throw errorClase

        alert("Reserva cancelada con éxito.")
        cargarDatosYClases()
    } catch (err) {
        alert("Error al cancelar la reserva: " + err.message)
    }
}

// 7. ACORDEÓN Y CALENDARIO MENSUAL DINÁMICO
const btnToggleAcordeon = document.getElementById('btn-toggle-acordeon')
const contenidoAcordeonCalendario = document.getElementById('contenido-acordeon-calendario')
const iconoFlecha = document.getElementById('icono-flecha')

if (btnToggleAcordeon && contenidoAcordeonCalendario) {
    btnToggleAcordeon.addEventListener('click', () => {
        const estaOculto = contenidoAcordeonCalendario.classList.contains('hidden')
        if (estaOculto) {
            contenidoAcordeonCalendario.classList.remove('hidden')
            if (iconoFlecha) iconoFlecha.style.transform = 'rotate(180deg)'
            renderizarCalendarioMensual()
        } else {
            contenidoAcordeonCalendario.classList.add('hidden')
            if (iconoFlecha) iconoFlecha.style.transform = 'rotate(0deg)'
        }
    })
}

let mesActualIndex = new Date().getMonth()
let anioActual = new Date().getFullYear()

const grillaCalendarioMes = document.getElementById('grilla-calendario-mes')
const labelMesAnio = document.getElementById('label-mes-anio')
const btnMesAnterior = document.getElementById('btn-mes-anterior')
const btnMesSiguiente = document.getElementById('btn-mes-siguiente')
const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

if (btnMesAnterior) {
    btnMesAnterior.addEventListener('click', () => {
        mesActualIndex--
        if (mesActualIndex < 0) { mesActualIndex = 11; anioActual--; }
        renderizarCalendarioMensual()
    })
}

if (btnMesSiguiente) {
    btnMesSiguiente.addEventListener('click', () => {
        mesActualIndex++
        if (mesActualIndex > 11) { mesActualIndex = 0; anioActual++; }
        renderizarCalendarioMensual()
    })
}

async function renderizarCalendarioMensual() {
    if (!grillaCalendarioMes) return
    grillaCalendarioMes.innerHTML = ""
    if (labelMesAnio) labelMesAnio.textContent = `${nombresMeses[mesActualIndex]} ${anioActual}`

    const primerDiaMes = new Date(anioActual, mesActualIndex, 1).getDay()
    const desplazamiento = primerDiaMes === 0 ? 6 : primerDiaMes - 1
    const totalDiasMes = new Date(anioActual, mesActualIndex + 1, 0).getDate()

    let clasesMes = []
    let feriadosMes = []
    let misReservas = []
    try {
        const resClases = await supabase.from('gimnasio_clases').select('*').order('horario', { ascending: true })
        if (resClases.data) clasesMes = resClases.data

        const resFeriados = await supabase.from('gimnasio_feriados').select('*')
        if (resFeriados.data) feriadosMes = resFeriados.data

        if (clientaidActual) {
            const resRes = await supabase.from('gimnasio_reservas').select('*').eq('clienta_id', clientaidActual)
            if (resRes.data) misReservas = resRes.data
        }
    } catch (e) { console.error(e) }

    for (let i = 0; i < desplazamiento; i++) {
        const vacio = document.createElement('div')
        vacio.className = "h-28 bg-zinc-950/40 border border-zinc-900 rounded-xl opacity-25"
        grillaCalendarioMes.appendChild(vacio)
    }

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const mesStr = String(mesActualIndex + 1).padStart(2, '0')
        const diaStr = String(dia).padStart(2, '0')
        const fechaCelda = `${anioActual}-${mesStr}-${diaStr}`

        const feriadoHoy = feriadosMes.find(f => f.fecha && f.fecha.substring(0, 10) === fechaCelda)

        const celda = document.createElement('div')
        if (feriadoHoy) {
            celda.className = "h-28 bg-red-950/40 border border-red-500/40 rounded-xl p-2 flex flex-col justify-between overflow-y-auto"
        } else {
            celda.className = "h-28 bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex flex-col justify-between overflow-y-auto hover:border-zinc-700 transition"
        }

        const headerCelda = document.createElement('div')
        headerCelda.className = "flex justify-between items-center"

        const numeroDia = document.createElement('span')
        numeroDia.className = "text-xs font-bold text-zinc-400"
        numeroDia.textContent = dia
        headerCelda.appendChild(numeroDia)

        if (feriadoHoy) {
            const badgeFeriado = document.createElement('span')
            badgeFeriado.className = "text-[9px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/30 uppercase truncate"
            badgeFeriado.textContent = feriadoHoy.motivo || 'Cerrado'
            headerCelda.appendChild(badgeFeriado)
        }

        celda.appendChild(headerCelda)

        const contenedorClases = document.createElement('div')
        contenedorClases.className = "space-y-1 mt-1"

        if (!feriadoHoy) {
            const clasesDelDia = clasesMes.filter(c => c.fecha && c.fecha.substring(0, 10) === fechaCelda)
            clasesDelDia.forEach(clase => {
                const reserva = misReservas.find(r => r.clase_id === clase.id)
                const libres = clase.totales - (clase.ocupados || 0)

                const badgeClase = document.createElement('div')
                if (reserva) {
                    // Si ya está reservada, muestra la opción de cancelar directo en el calendario del día
                    badgeClase.className = "w-full text-left bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-[10px] px-2 py-1 rounded-lg truncate font-semibold flex justify-between items-center cursor-pointer hover:bg-red-950/80 hover:border-red-500/40 hover:text-red-200 transition"
                    badgeClase.title = "Haz clic para cancelar tu reserva"
                    badgeClase.innerHTML = `<span>✓ ${clase.horario} ${clase.nombre.toLowerCase()}</span> <span class="text-[9px] underline">Cancelar</span>`
                    badgeClase.onclick = () => cancelarReserva(reserva.id, clase.id, clase.ocupados, clase.nombre)
                } else {
                    badgeClase.className = "w-full text-left bg-pink-950/60 border border-pink-500/30 text-pink-200 text-[10px] px-2 py-1 rounded-lg truncate font-semibold flex justify-between items-center cursor-pointer hover:bg-pink-900 transition"
                    badgeClase.title = "Haz clic para reservar"
                    badgeClase.innerHTML = `<span>${clase.horario} ${clase.nombre.toLowerCase()}</span> <span class="text-[9px] text-emerald-400 font-bold">${libres} lib</span>`
                    badgeClase.onclick = () => reservarTurno(clase.id, clase.nombre, clase.horario, clase.ocupados || 0)
                }
                contenedorClases.appendChild(badgeClase)
            })
        } else {
            const avisoCerrado = document.createElement('div')
            avisoCerrado.className = "text-[10px] text-red-400 italic text-center pt-3 font-semibold"
            avisoCerrado.textContent = "🔒 Día no laborable"
            contenedorClases.appendChild(avisoCerrado)
        }

        celda.appendChild(contenedorClases)
        grillaCalendarioMes.appendChild(celda)
    }
}

// Menú responsive móvil
const sidebarMovil = document.getElementById('sidebar-movil')
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')
const btnCerrarSidebar = document.getElementById('btn-cerrar-sidebar')

if (btnToggleSidebar && sidebarMovil) btnToggleSidebar.addEventListener('click', () => sidebarMovil.classList.toggle('-translate-x-full'))
if (btnCerrarSidebar && sidebarMovil) btnCerrarSidebar.addEventListener('click', () => sidebarMovil.classList.add('-translate-x-full'))

document.querySelectorAll('aside nav a').forEach(link => {
    link.addEventListener('click', () => { if (window.innerWidth < 768 && sidebarMovil) sidebarMovil.classList.add('-translate-x-full') })
})