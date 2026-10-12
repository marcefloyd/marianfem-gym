import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ciorlilsipudyqhuzxzh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VFhlc6La51QGJT-_qVu19Q_6hqlXWof'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const tablaTurnos = document.getElementById('tabla-turnos-gimnasio')

// 1. VERIFICACIÓN DE SESIÓN ADMIN
async function verificarSesionAdmin() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        window.location.href = 'admin-login.html'
    } else {
        cargarDatosDashboard()
    }
}

verificarSesionAdmin()

// 2. CIERRE DE SESIÓN
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion')
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
        await supabase.auth.signOut()
        window.location.href = 'admin-login.html'
    })
}

// 3. CONTROL DE VISTAS (Pestañas del Menú Lateral)
const navDashboard = document.getElementById('nav-dashboard')
const navRegistrar = document.getElementById('nav-registrar')
const viewDashboard = document.getElementById('view-dashboard')
const viewRegistrar = document.getElementById('view-registrar')

function cambiarVista(vistaActiva) {
    if (viewDashboard) viewDashboard.classList.add('hidden')
    if (viewRegistrar) viewRegistrar.classList.add('hidden')

    if (navDashboard) navDashboard.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition"
    if (navRegistrar) navRegistrar.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition"

    if (vistaActiva === 'dashboard') {
        if (viewDashboard) viewDashboard.classList.remove('hidden')
        if (navDashboard) navDashboard.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
    } else if (vistaActiva === 'registrar') {
        if (viewRegistrar) viewRegistrar.classList.remove('hidden')
        if (navRegistrar) navRegistrar.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
    }
}

if (navDashboard) {
    navDashboard.addEventListener('click', (e) => { e.preventDefault(); cambiarVista('dashboard'); })
}
if (navRegistrar) {
    navRegistrar.addEventListener('click', (e) => { e.preventDefault(); cambiarVista('registrar'); })
}

// 4. CARGAR DATOS Y MÉTRICAS DESDE SUPABASE
async function cargarDatosDashboard() {
    await cargarClasesSupabase()
    await cargarMetricasClientas()
    renderizarCalendarioMensual()
}

async function cargarClasesSupabase() {
    try {
        const { data, error } = await supabase
            .from('gimnasio_clases')
            .select('*')
            .order('fecha', { ascending: true })

        if (error) throw error

        renderizarTablaTurnos(data)
        actualizarContadorTurnosHoy(data)
    } catch (err) {
        console.error("Error al cargar clases:", err.message)
    }
}

function renderizarTablaTurnos(clases) {
    if (!tablaTurnos) return
    tablaTurnos.innerHTML = ""

    if (!clases || clases.length === 0) {
        tablaTurnos.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-xs text-zinc-500 italic">No hay clases registradas en Supabase.</td></tr>`
        return
    }

    clases.forEach((clase) => {
        const tr = document.createElement('tr')
        tr.className = "hover:bg-zinc-800/50 transition"

        const tdFechaHora = document.createElement('td')
        tdFechaHora.className = "py-3 px-3 font-bold text-white"
        tdFechaHora.innerHTML = `${clase.fecha || 'Sin fecha'} <br><span class="text-xs text-pink-500 font-normal">${clase.horario} hs</span>`

        const tdDisc = document.createElement('td')
        tdDisc.className = "py-3 px-3 text-zinc-300"
        tdDisc.innerHTML = `${clase.nombre}<br><span class="text-xs text-zinc-500 font-normal">${clase.categoria || 'Entrenamiento'}</span>`

        const tdCupos = document.createElement('td')
        tdCupos.className = "py-3 px-3"
        const span = document.createElement('span')
        const libres = clase.totales - (clase.ocupados || 0)

        if (libres <= 0) {
            span.className = "bg-pink-500/10 text-pink-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-pink-500/20"
            span.textContent = "Llena (Cupo Máximo)"
        } else {
            span.className = "bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20"
            span.textContent = `${libres} lugares libres`
        }
        tdCupos.appendChild(span)

        const tdAccion = document.createElement('td')
        tdAccion.className = "py-3 px-3 text-right space-x-2"
        
        // Botón Ver Asistencia
        const btn = document.createElement('button')
        btn.className = "text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-200 font-semibold transition"
        btn.textContent = "Ver Asistencia"
        btn.onclick = () => abrirDetalleTurno(clase.id, clase.nombre, clase.horario)
        tdAccion.appendChild(btn)

        // Botón Eliminar Clase
        const btnEliminar = document.createElement('button')
        btnEliminar.className = "text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg font-semibold transition"
        btnEliminar.textContent = "🗑️ Eliminar"
        btnEliminar.onclick = () => eliminarClaseSupabase(clase.id, clase.nombre, clase.fecha)
        tdAccion.appendChild(btnEliminar)

        tr.appendChild(tdFechaHora)
        tr.appendChild(tdDisc)
        tr.appendChild(tdCupos)
        tr.appendChild(tdAccion)

        tablaTurnos.appendChild(tr)
    })
}

// Función auxiliar para eliminar la clase en Supabase
async function eliminarClaseSupabase(idClase, nombreClase, fechaClase) {
    const confirmar = confirm(`¿Estás segura de que deseas eliminar la clase de "${nombreClase}" del día ${fechaClase}?`)
    if (!confirmar) return

    try {
        const { error } = await supabase
            .from('gimnasio_clases')
            .delete()
            .eq('id', idClase)

        if (error) throw error

        alert("¡Clase eliminada con éxito!")
        cargarClasesSupabase()
        renderizarCalendarioMensual()
    } catch (err) {
        alert("Error al eliminar la clase: " + err.message)
        console.error(err)
    }
}

function actualizarContadorTurnosHoy(clases) {
    const contadorEl = document.getElementById('turnos-hoy-count')
    const estadoEl = document.getElementById('turnos-estado')
    
    const hoyStr = new Date().toISOString().split('T')[0]
    const clasesHoy = clases ? clases.filter(c => c.fecha === hoyStr) : []
    const totalClases = clasesHoy.length

    if (contadorEl) contadorEl.textContent = `${totalClases} Clases`
    if (estadoEl) {
        estadoEl.textContent = totalClases > 0 ? "Programadas hoy" : "Sin clases hoy"
        estadoEl.className = totalClases > 0 ? "text-xs text-emerald-400 font-bold" : "text-xs text-zinc-500 font-bold"
    }
}

async function cargarMetricasClientas() {
    try {
        const { data: clientas, error } = await supabase.from('gimnasio_clientas').select('*')
        if (error) return

        let activas = clientas.length
        let cantBase = clientas.filter(c => c.plan === 'base').length
        let cantPro = clientas.filter(c => c.plan === 'pro').length
        let gananciaTotal = (cantBase * 30) + (cantPro * 50)

        document.getElementById('total-clientas-activas').textContent = activas
        document.getElementById('ganancia-estimada').textContent = `$ ${gananciaTotal} USD`
        document.getElementById('cant-base').textContent = cantBase
        document.getElementById('cant-pro').textContent = cantPro
    } catch (err) {
        console.error("Error al calcular métricas:", err)
    }
}

// 5. REGISTRO DE NUEVA CLIENTA
const formRegistrar = document.getElementById('form-registrar-clienta')
if (formRegistrar) {
    formRegistrar.addEventListener('submit', async (e) => {
        e.preventDefault()

        const nombre = document.getElementById('reg-nombre').value
        const dni = document.getElementById('reg-dni').value
        const telefono = document.getElementById('reg-telefono').value
        const plan = document.getElementById('reg-plan').value
        const email = document.getElementById('reg-email').value
        const password = document.getElementById('reg-password').value
        const ficha = document.getElementById('reg-ficha').value

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
            if (authError) throw authError

            const { error: dbError } = await supabase
                .from('gimnasio_clientas')
                .insert([{ user_id: authData.user.id, nombre, dni, telefono, plan, email, ficha_medica: ficha }])

            if (dbError) throw dbError

            alert(`¡Clienta ${nombre} registrada con éxito!`)
            formRegistrar.reset()
            cambiarVista('dashboard')
            cargarMetricasClientas()
        } catch (err) {
            alert("Error al registrar clienta: " + err.message)
        }
    })
}

// 6. CONTROL DEL MODAL PARA AGREGAR CLASES
const modalClase = document.getElementById('modal-clase')
const btnAbrirModal = document.getElementById('btn-abrir-modal-clase')
const btnCerrarModal = document.getElementById('btn-cerrar-modal')
const btnCancelarModal = document.getElementById('btn-cancelar-modal')
const formCrearClase = document.getElementById('form-crear-clase')

if (btnAbrirModal && modalClase) {
    btnAbrirModal.addEventListener('click', () => {
        document.getElementById('clase-fecha').value = new Date().toISOString().split('T')[0]
        modalClase.classList.remove('hidden')
    })
}

function cerrarModalClase() { if (modalClase) { modalClase.classList.add('hidden'); if (formCrearClase) formCrearClase.reset(); } }
if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalClase)
if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalClase)

if (formCrearClase) {
    formCrearClase.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fecha = document.getElementById('clase-fecha').value
        const horario = document.getElementById('clase-horario').value
        const nombre = document.getElementById('clase-nombre').value
        const categoria = document.getElementById('clase-categoria').value
        const totales = parseInt(document.getElementById('clase-totales').value)

        try {
            const { error } = await supabase.from('gimnasio_clases').insert([{ fecha, horario, nombre, categoria, totales, ocupados: 0 }])
            if (error) throw error
            alert("¡Clase agregada con éxito al cronograma y calendario!")
            cerrarModalClase()
            cargarClasesSupabase()
            renderizarCalendarioMensual()
        } catch (err) {
            alert("Error al guardar la clase: " + err.message)
        }
    })
}

// 7. CONTROL DEL ACORDEÓN DESPLEGABLE DEL CALENDARIO
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

// 8. CONTROL DEL MENÚ RESPONSIVE EN CELULARES
const sidebarMovil = document.getElementById('sidebar-movil')
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')
const btnCerrarSidebar = document.getElementById('btn-cerrar-sidebar')

if (btnToggleSidebar && sidebarMovil) btnToggleSidebar.addEventListener('click', () => sidebarMovil.classList.toggle('-translate-x-full'))
if (btnCerrarSidebar && sidebarMovil) btnCerrarSidebar.addEventListener('click', () => sidebarMovil.classList.add('-translate-x-full'))

document.querySelectorAll('aside nav a').forEach(link => {
    link.addEventListener('click', () => { if (window.innerWidth < 768 && sidebarMovil) sidebarMovil.classList.add('-translate-x-full') })
})

// 9. CALENDARIO MENSUAL DINÁMICO CON CLASES Y FERIADOS DE SUPABASE
let mesActualIndex = new Date().getMonth()
let anioActual = new Date().getFullYear()

const grillaCalendarioMes = document.getElementById('grilla-calendario-mes')
const labelMesAnio = document.getElementById('label-mes-anio')
const btnMesAnterior = document.getElementById('btn-mes-anterior')
const btnMesSiguiente = document.getElementById('btn-mes-siguiente')
const btnMarcarFeriado = document.getElementById('btn-marcar-feriado')

const modalDetalleTurno = document.getElementById('modal-detalle-turno')
const btnCerrarModalDetalle = document.getElementById('btn-cerrar-modal-detalle')
const btnCerrarDetalleFooter = document.getElementById('btn-cerrar-detalle-footer')
const listaAlumnasTurno = document.getElementById('lista-alumnas-turno')

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

if (btnMarcarFeriado) {
    btnMarcarFeriado.addEventListener('click', async () => {
        const fechaFeriado = prompt("Ingresa la fecha a marcar como Feriado / Cerrado (YYYY-MM-DD):")
        if (!fechaFeriado) return

        const motivo = prompt("Motivo del cierre (ej: Feriado Nacional):") || "Cerrado"

        try {
            const { error } = await supabase.from('gimnasio_feriados').insert([{ fecha: fechaFeriado, motivo: motivo }])
            if (error) throw error

            alert(`¡Día ${fechaFeriado} marcado como Feriado en Supabase!`)
            renderizarCalendarioMensual()
        } catch (err) {
            alert("Error al guardar feriado: " + err.message)
        }
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
    try {
        const resClases = await supabase.from('gimnasio_clases').select('*').order('horario', { ascending: true })
        if (resClases.data) clasesMes = resClases.data

        const resFeriados = await supabase.from('gimnasio_feriados').select('*')
        if (resFeriados.data) feriadosMes = resFeriados.data
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

        const feriadoHoy = feriadosMes.find(f => f.fecha === fechaCelda)

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
            const clasesDelDia = clasesMes.filter(c => c.fecha === fechaCelda)
            clasesDelDia.forEach(clase => {
                const badgeClase = document.createElement('button')
                badgeClase.className = "w-full text-left bg-pink-950/60 hover:bg-pink-900/80 border border-pink-500/30 text-pink-200 text-[10px] px-2 py-1 rounded-lg truncate font-semibold transition"
                badgeClase.textContent = `${clase.horario} ${clase.nombre.toLowerCase()}`
                badgeClase.onclick = () => abrirDetalleTurno(clase.id, clase.nombre, clase.horario)
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

window.abrirDetalleTurno = async function(claseId, nombreClase, horarioClase) {
    if (!modalDetalleTurno) return
    modalDetalleTurno.classList.remove('hidden')
    document.getElementById('modal-turno-titulo').textContent = `${nombreClase} (${horarioClase} hs)`
    
    if (listaAlumnasTurno) {
        listaAlumnasTurno.innerHTML = `<div class="text-center text-xs text-zinc-500 py-4">Buscando alumnas anotadas...</div>`
        
        try {
            // 1. Buscar las reservas de esta clase
            const { data: reservas, error: errReserva } = await supabase
                .from('gimnasio_reservas')
                .select('*')
                .eq('clase_id', claseId)

            if (errReserva) throw errReserva

            if (!reservas || reservas.length === 0) {
                listaAlumnasTurno.innerHTML = `<div class="text-center text-xs text-zinc-500 py-4 italic">No hay alumnas anotadas en esta clase todavía.</div>`
                return
            }

            // 2. Obtener los datos de las clientas para esas reservas
            listaAlumnasTurno.innerHTML = ""
            for (const reserva of reservas) {
                const { data: clienta } = await supabase
                    .from('gimnasio_clientas')
                    .select('*')
                    .eq('id', reserva.clienta_id)
                    .single()

                if (!clienta) continue

                const tarjetaClienta = document.createElement('div')
                tarjetaClienta.className = "bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl space-y-2 text-xs"
                tarjetaClienta.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-white text-sm">${clienta.nombre}</p>
                            <p class="text-[10px] text-pink-400">DNI: ${clienta.dni || 'No especificado'} | Tel: ${clienta.telefono}</p>
                        </div>
                        <span class="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">${clienta.plan}</span>
                    </div>
                    <div class="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/60 text-[11px] text-zinc-300">
                        <strong class="text-pink-400">Ficha Médica:</strong> ${clienta.ficha_medica || 'Sin observaciones registradas.'}
                    </div>
                    <div class="flex justify-end pt-1">
                        <a href="https://wa.me/${clienta.telefono.replace(/[^0-9]/g, '')}" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 text-[11px]">
                            <span>💬</span><span>Contactar por WhatsApp</span>
                        </a>
                    </div>
                `
                listaAlumnasTurno.appendChild(tarjetaClienta)
            }

        } catch (e) {
            console.error(e)
            listaAlumnasTurno.innerHTML = `<div class="text-center text-xs text-red-400">Error al cargar las asistentes.</div>`
        }
    }
}

function cerrarModalDetalle() {
    if (modalDetalleTurno) modalDetalleTurno.classList.add('hidden')
}

if (btnCerrarModalDetalle) btnCerrarModalDetalle.addEventListener('click', cerrarModalDetalle)
if (btnCerrarDetalleFooter) btnCerrarDetalleFooter.addEventListener('click', cerrarModalDetalle)