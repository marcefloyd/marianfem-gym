import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ciorlilsipudyqhuzxzh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VFhlc6La51QGJT-_qVu19Q_6hqlXWof'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const tablaTurnos = document.getElementById('tabla-turnos-gimnasio')

async function verificarSesionAdmin() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        window.location.href = 'admin-login.html'
    } else {
        cargarDatosDashboard()
        cargarClientasBuscador()
    }
}

verificarSesionAdmin()

const btnCerrarSesion = document.getElementById('btn-cerrar-sesion')
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
        await supabase.auth.signOut()
        window.location.href = 'admin-login.html'
    })
}

const navDashboard = document.getElementById('nav-dashboard')
const navClientas = document.getElementById('nav-clientas')
const navRegistrar = document.getElementById('nav-registrar')

const viewDashboard = document.getElementById('view-dashboard')
const viewClientas = document.getElementById('view-clientas')
const viewRegistrar = document.getElementById('view-registrar')

function cambiarVista(vistaActiva) {
    if (viewDashboard) viewDashboard.classList.add('hidden')
    if (viewClientas) viewClientas.classList.add('hidden')
    if (viewRegistrar) viewRegistrar.classList.add('hidden')

    const navs = [navDashboard, navClientas, navRegistrar]
    navs.forEach(n => {
        if (n) n.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition"
    })

    if (vistaActiva === 'dashboard') {
        if (viewDashboard) viewDashboard.classList.remove('hidden')
        if (navDashboard) navDashboard.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
    } else if (vistaActiva === 'clientas') {
        if (viewClientas) viewClientas.classList.remove('hidden')
        if (navClientas) navClientas.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
        cargarClientasBuscador()
    } else if (vistaActiva === 'registrar') {
        if (viewRegistrar) viewRegistrar.classList.remove('hidden')
        if (navRegistrar) navRegistrar.className = "flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 font-semibold transition"
    }
}

if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); cambiarVista('dashboard'); })
if (navClientas) navClientas.addEventListener('click', (e) => { e.preventDefault(); cambiarVista('clientas'); })
if (navRegistrar) navRegistrar.addEventListener('click', (e) => { e.preventDefault(); cambiarVista('registrar'); })

async function cargarDatosDashboard() {
    await cargarClasesSupabase()
    await cargarMetricasClientas()
    renderizarCalendarioMensual()
}

async function cargarClasesSupabase() {
    try {
        const { data, error } = await supabase.from('gimnasio_clases').select('*').order('fecha', { ascending: true })
        if (error) throw error
        renderizarTablaTurnos(data)
        actualizarContadorTurnosHoy(data)
    } catch (err) { console.error(err) }
}

function renderizarTablaTurnos(clases) {
    if (!tablaTurnos) return
    tablaTurnos.innerHTML = ""
    if (!clases || clases.length === 0) {
        tablaTurnos.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-xs text-zinc-500 italic">No hay clases registradas.</td></tr>`
        return
    }

    clases.forEach((clase) => {
        const tr = document.createElement('tr')
        tr.className = "hover:bg-zinc-800/50 transition"

        const libres = clase.totales - (clase.ocupados || 0)
        tr.innerHTML = `
            <td class="py-3 px-3 font-bold text-white">${clase.fecha} <br><span class="text-xs text-pink-500 font-normal">${clase.horario} hs</span></td>
            <td class="py-3 px-3 text-zinc-300">${clase.nombre}<br><span class="text-xs text-zinc-500 font-normal">${clase.categoria || 'Entrenamiento'}</span></td>
            <td class="py-3 px-3"><span class="text-xs px-2.5 py-1 rounded-full font-semibold border ${libres <= 0 ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}">${libres <= 0 ? 'Llena' : libres + ' lugares libres'}</span></td>
            <td class="py-3 px-3 text-right space-x-2">
                <button class="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-200 font-semibold transition" onclick="abrirDetalleTurno('${clase.id}', '${clase.nombre}', '${clase.horario}')">Ver Asistencia</button>
                <button class="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg font-semibold transition" onclick="eliminarClaseSupabase('${clase.id}', '${clase.nombre}', '${clase.fecha}')">🗑️ Eliminar</button>
            </td>
        `
        tablaTurnos.appendChild(tr)
    })
}

async function eliminarClaseSupabase(idClase, nombreClase, fechaClase) {
    if (!confirm(`¿Eliminar la clase de "${nombreClase}" del día ${fechaClase}?`)) return
    try {
        const { error } = await supabase.from('gimnasio_clases').delete().eq('id', idClase)
        if (error) throw error
        alert("¡Clase eliminada con éxito!")
        cargarClasesSupabase()
        renderizarCalendarioMensual()
    } catch (err) { alert("Error: " + err.message) }
}

function actualizarContadorTurnosHoy(clases) {
    const contadorEl = document.getElementById('turnos-hoy-count')
    const estadoEl = document.getElementById('turnos-estado')
    const hoyStr = new Date().toISOString().split('T')[0]
    const clasesHoy = clases ? clases.filter(c => c.fecha === hoyStr) : []
    if (contadorEl) contadorEl.textContent = `${clasesHoy.length} Clases`
    if (estadoEl) {
        estadoEl.textContent = clasesHoy.length > 0 ? "Programadas hoy" : "Sin clases hoy"
        estadoEl.className = clasesHoy.length > 0 ? "text-xs text-emerald-400 font-bold" : "text-xs text-zinc-500 font-bold"
    }
}

async function cargarMetricasClientas() {
    try {
        const { data: clientas } = await supabase.from('gimnasio_clientas').select('*')
        if (!clientas) return
        let activas = clientas.length
        let cantBase = clientas.filter(c => c.plan === 'base').length
        let cantPro = clientas.filter(c => c.plan === 'pro').length
        document.getElementById('total-clientas-activas').textContent = activas
        document.getElementById('ganancia-estimada').textContent = `$ ${(cantBase * 30) + (cantPro * 50)} USD`
        document.getElementById('cant-base').textContent = cantBase
        document.getElementById('cant-pro').textContent = cantPro
    } catch (err) { console.error(err) }
}

const inputBuscarClienta = document.getElementById('input-buscar-clienta')
const contenedorListaBusqueda = document.getElementById('contenedor-lista-busqueda')
const panelFichaDetalle = document.getElementById('panel-ficha-detalle')

async function cargarClientasBuscador(filtro = '') {
    if (!contenedorListaBusqueda) return
    contenedorListaBusqueda.innerHTML = `<div class="text-center text-xs text-zinc-500 py-4">Cargando clientas...</div>`

    try {
        const { data: clientas, error } = await supabase.from('gimnasio_clientas').select('*').order('nombre', { ascending: true })
        if (error) throw error

        const filtradas = clientas.filter(c => 
            c.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
            (c.dni && c.dni.includes(filtro)) || 
            (c.telefono && c.telefono.includes(filtro))
        )

        if (filtradas.length === 0) {
            contenedorListaBusqueda.innerHTML = `<div class="text-center text-xs text-zinc-500 py-4 italic">No se encontraron clientas.</div>`
            return
        }

        contenedorListaBusqueda.innerHTML = ""
        filtradas.forEach(clienta => {
            const card = document.createElement('div')
            card.className = "bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 p-3.5 rounded-xl cursor-pointer transition space-y-1"
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <p class="font-bold text-white text-sm">${clienta.nombre}</p>
                    <span class="text-[10px] bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded font-semibold uppercase">${clienta.plan || 'base'}</span>
                </div>
                <p class="text-[11px] text-zinc-400">DNI: ${clienta.dni || 'S/D'} | Tel: ${clienta.telefono || 'S/D'}</p>
            `
            card.onclick = () => mostrarFichaCompletaClienta(clienta)
            contenedorListaBusqueda.appendChild(card)
        })

    } catch (e) {
        console.error(e)
        contenedorListaBusqueda.innerHTML = `<div class="text-center text-xs text-red-400">Error al cargar listado.</div>`
    }
}

if (inputBuscarClienta) {
    inputBuscarClienta.addEventListener('input', (e) => {
        cargarClientasBuscador(e.target.value)
    })
}

async function mostrarFichaCompletaClienta(clienta) {
    if (!panelFichaDetalle) return

    panelFichaDetalle.innerHTML = `<div class="text-center text-xs text-zinc-500 py-10">Cargando historial y notas de evolución...</div>`

    try {
        const hoyStr = new Date().toISOString().split('T')[0]

        const { data: reservas } = await supabase
            .from('gimnasio_reservas')
            .select('*, gimnasio_clases(*)')
            .eq('clienta_id', clienta.id)

        const { data: notas } = await supabase
            .from('gimnasio_notas_clientas')
            .select('*')
            .eq('clienta_id', clienta.id)
            .order('created_at', { ascending: false })

        let htmlClases = ""
        if (!reservas || reservas.length === 0) {
            htmlClases = `<p class="text-xs text-zinc-500 italic">Sin clases reservadas todavía.</p>`
        } else {
            reservas.forEach(r => {
                const c = r.gimnasio_clases
                if (c) {
                    const esPasada = c.fecha < hoyStr
                    const badgeClase = esPasada 
                        ? `<span class="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-semibold">Asistió</span>`
                        : `<span class="text-[10px] bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded font-semibold">Inscripta (Próxima)</span>`

                    htmlClases += `
                        <div class="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs flex justify-between items-center">
                            <div>
                                <span class="font-bold text-white">${c.nombre}</span>
                                <p class="text-[10px] text-zinc-400">Fecha: ${c.fecha} - ${c.horario} hs</p>
                            </div>
                            ${badgeClase}
                        </div>
                    `
                }
            })
        }

        let htmlNotas = ""
        if (!notas || notas.length === 0) {
            htmlNotas = `<p class="text-xs text-zinc-500 italic">No hay notas de evolución registradas aún.</p>`
        } else {
            notas.forEach(n => {
                const fechaFmt = new Date(n.created_at).toLocaleDateString()
                htmlNotas += `
                    <div class="bg-zinc-900 border border-zinc-800 p-3 rounded-xl space-y-2 text-xs flex justify-between items-start">
                        <div class="space-y-1">
                            <span class="text-[10px] text-pink-400 font-bold">${fechaFmt}</span>
                            <p class="text-zinc-300" id="texto-nota-${n.id}">${n.nota}</p>
                        </div>
                        <button class="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-lg font-semibold transition shrink-0 ml-2" onclick="editarNotaClienta('${n.id}', '${clienta.id}')">✏️ Editar</button>
                    </div>
                `
            })
        }

        panelFichaDetalle.innerHTML = `
            <div class="space-y-5">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-800 pb-4">
                    <div>
                        <h4 class="font-black text-white text-base">${clienta.nombre}</h4>
                        <p class="text-xs text-pink-400">DNI: ${clienta.dni || 'S/D'} | Tel: ${clienta.telefono}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button id="btn-editar-clienta" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition">✏️ Editar Ficha</button>
                        <a href="https://wa.me/${clienta.telefono.replace(/[^0-9]/g, '')}?text=Hola%20${clienta.nombre},%20te%20escribimos%20desde%20Marian%20Fem..." target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1">
                            <span>💬</span><span>WhatsApp</span>
                        </a>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div class="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1">
                        <span class="font-bold text-pink-400 uppercase tracking-wider text-[10px]">Ficha Médica / Lesiones</span>
                        <p class="text-zinc-300">${clienta.ficha_medica || 'Sin observaciones registradas.'}</p>
                    </div>
                    <div class="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1">
                        <span class="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Plan Activo</span>
                        <p class="text-zinc-300 font-semibold uppercase">${clienta.plan || 'Plan Base'}</p>
                    </div>
                </div>

                <!-- Historial de Clases Scroleable -->
                <div class="space-y-2">
                    <h5 class="text-xs font-bold text-white uppercase tracking-wider">Historial y Turnos Reservados</h5>
                    <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        ${htmlClases}
                    </div>
                </div>

                <!-- Notas de Evolución Acumulativas y Scroleables -->
                <div class="space-y-3 pt-2 border-t border-zinc-800">
                    <h5 class="text-xs font-bold text-white uppercase tracking-wider">Notas de Evolución (Semanal / Mensual)</h5>
                    <div class="space-y-2">
                        <textarea id="input-nueva-nota" rows="2" placeholder="Escribe una nota sobre su rendimiento, progreso o evolución..." class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"></textarea>
                        <div class="flex justify-end">
                            <button id="btn-guardar-nota" class="bg-pink-600 hover:bg-pink-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition">Guardar Nota</button>
                        </div>
                    </div>
                    <div class="space-y-2 max-h-40 overflow-y-auto pr-1 pt-2" id="contenedor-lista-notas">
                        ${htmlNotas}
                    </div>
                </div>
            </div>
        `

        document.getElementById('btn-editar-clienta').onclick = async () => {
            const nuevoNombre = prompt("Editar Nombre:", clienta.nombre)
            if (nuevoNombre === null) return
            const nuevoTel = prompt("Editar Teléfono / WhatsApp:", clienta.telefono)
            if (nuevoTel === null) return
            const nuevoDni = prompt("Editar DNI:", clienta.dni || "")
            if (nuevoDni === null) return
            const nuevaFicha = prompt("Editar Ficha Médica:", clienta.ficha_medica || "")
            if (nuevaFicha === null) return

            try {
                const { error } = await supabase
                    .from('gimnasio_clientas')
                    .update({ nombre: nuevoNombre, telefono: nuevoTel, dni: nuevoDni, ficha_medica: nuevaFicha })
                    .eq('id', clienta.id)

                if (error) throw error
                alert("¡Ficha actualizada con éxito!")
                clienta.nombre = nuevoNombre
                clienta.telefono = nuevoTel
                clienta.dni = nuevoDni
                clienta.ficha_medica = nuevaFicha
                mostrarFichaCompletaClienta(clienta)
                cargarClientasBuscador()
            } catch (err) {
                alert("Error al actualizar: " + err.message)
            }
        }

        document.getElementById('btn-guardar-nota').onclick = async () => {
            const textoNota = document.getElementById('input-nueva-nota').value.trim()
            if (!textoNota) return alert("Escribe un texto para la nota.")

            try {
                const { error } = await supabase.from('gimnasio_notas_clientas').insert([{
                    clienta_id: clienta.id,
                    nota: textoNota
                }])
                if (error) throw error
                alert("¡Nota guardada con éxito!")
                mostrarFichaCompletaClienta(clienta)
            } catch (err) {
                alert("Error al guardar nota: " + err.message)
            }
        }

        window.editarNotaClienta = async function(idNota, clienteId) {
            const textoActual = document.getElementById(`texto-nota-${idNota}`).textContent
            const nuevoTexto = prompt("Editar nota de evolución:", textoActual)
            if (nuevoTexto === null) return

            try {
                const { error } = await supabase
                    .from('gimnasio_notas_clientas')
                    .update({ nota: nuevoTexto })
                    .eq('id', idNota)

                if (error) throw error
                alert("¡Nota actualizada!")
                mostrarFichaCompletaClienta(clienta)
            } catch (err) {
                alert("Error al editar nota: " + err.message)
            }
        }

    } catch (e) {
        console.error(e)
        panelFichaDetalle.innerHTML = `<div class="text-center text-xs text-red-400 py-10">Error al cargar ficha completa.</div>`
    }
}

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
        } catch (err) { alert("Error: " + err.message) }
    })
}

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
            alert("¡Clase agregada con éxito!")
            cerrarModalClase()
            cargarClasesSupabase()
            renderizarCalendarioMensual()
        } catch (err) { alert("Error: " + err.message) }
    })
}

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

const sidebarMovil = document.getElementById('sidebar-movil')
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')
const btnCerrarSidebar = document.getElementById('btn-cerrar-sidebar')

if (btnToggleSidebar && sidebarMovil) btnToggleSidebar.addEventListener('click', () => sidebarMovil.classList.toggle('-translate-x-full'))
if (btnCerrarSidebar && sidebarMovil) btnCerrarSidebar.addEventListener('click', () => sidebarMovil.classList.add('-translate-x-full'))

document.querySelectorAll('aside nav a').forEach(link => {
    link.addEventListener('click', () => { if (window.innerWidth < 768 && sidebarMovil) sidebarMovil.classList.add('-translate-x-full') })
})

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
const btnEnviarAvisoGrupo = document.getElementById('btn-enviar-aviso-grupo')

const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

if (btnMesAnterior) btnMesAnterior.addEventListener('click', () => { mesActualIndex--; if (mesActualIndex < 0) { mesActualIndex = 11; anioActual--; } renderizarCalendarioMensual() })
if (btnMesSiguiente) btnMesSiguiente.addEventListener('click', () => { mesActualIndex++; if (mesActualIndex > 11) { mesActualIndex = 0; anioActual++; } renderizarCalendarioMensual() })

if (btnMarcarFeriado) {
    btnMarcarFeriado.addEventListener('click', async () => {
        const fechaFeriado = prompt("Fecha a marcar como Feriado (YYYY-MM-DD):")
        if (!fechaFeriado) return
        const motivo = prompt("Motivo del cierre:") || "Cerrado"
        try {
            const { error } = await supabase.from('gimnasio_feriados').insert([{ fecha: fechaFeriado, motivo }])
            if (error) throw error
            alert("¡Feriado guardado!")
            renderizarCalendarioMensual()
        } catch (e) { alert("Error: " + e.message) }
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
        celda.className = feriadoHoy ? "h-28 bg-red-950/40 border border-red-500/40 rounded-xl p-2 flex flex-col justify-between overflow-y-auto" : "h-28 bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex flex-col justify-between overflow-y-auto hover:border-zinc-700 transition"

        const headerCelda = document.createElement('div')
        headerCelda.className = "flex justify-between items-center"
        headerCelda.innerHTML = `<span class="text-xs font-bold text-zinc-400">${dia}</span>`
        if (feriadoHoy) {
            headerCelda.innerHTML += `<span class="text-[9px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/30 uppercase truncate">${feriadoHoy.motivo || 'Cerrado'}</span>`
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
            contenedorClases.innerHTML = `<div class="text-[10px] text-red-400 italic text-center pt-3 font-semibold">🔒 Cerrado</div>`
        }

        celda.appendChild(contenedorClases)
        grillaCalendarioMes.appendChild(celda)
    }
}

let telefonosInscriptasActuales = []

window.abrirDetalleTurno = async function(claseId, nombreClase, horarioClase) {
    if (!modalDetalleTurno) return
    modalDetalleTurno.classList.remove('hidden')
    document.getElementById('modal-turno-titulo').textContent = `${nombreClase} (${horarioClase} hs)`
    document.getElementById('input-aviso-grupo').value = ""
    telefonosInscriptasActuales = []
    
    if (listaAlumnasTurno) {
        listaAlumnasTurno.innerHTML = `<div class="text-center text-xs text-zinc-500 py-4">Buscando asistentes...</div>`
        try {
            const { data: reservas } = await supabase.from('gimnasio_reservas').select('*').eq('clase_id', claseId)
            if (!reservas || reservas.length === 0) {
                listaAlumnasTurno.innerHTML = `<div class="text-center text-xs text-zinc-500 py-4 italic">No hay alumnas anotadas.</div>`
                return
            }

            listaAlumnasTurno.innerHTML = ""
            for (const reserva of reservas) {
                const { data: clienta } = await supabase.from('gimnasio_clientas').select('*').eq('id', reserva.clienta_id).single()
                if (!clienta) continue

                if (clienta.telefono) {
                    telefonosInscriptasActuales.push({ nombre: clienta.nombre, telefono: clienta.telefono })
                }

                const div = document.createElement('div')
                div.className = "bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl space-y-2 text-xs"
                div.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-white text-sm">${clienta.nombre}</p>
                            <p class="text-[10px] text-pink-400">DNI: ${clienta.dni || 'S/D'} | Tel: ${clienta.telefono}</p>
                        </div>
                        <span class="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">${clienta.plan || 'base'}</span>
                    </div>
                    <div class="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/60 text-[11px] text-zinc-300">
                        <strong class="text-pink-400">Ficha Médica:</strong> ${clienta.ficha_medica || 'Sin observaciones.'}
                    </div>
                    <div class="flex justify-end pt-1">
                        <a href="https://wa.me/${clienta.telefono.replace(/[^0-9]/g, '')}" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 text-[11px]">
                            <span>💬</span><span>Contactar por WhatsApp</span>
                        </a>
                    </div>
                `
                listaAlumnasTurno.appendChild(div)
            }
        } catch (e) {
            listaAlumnasTurno.innerHTML = `<div class="text-center text-xs text-red-400">Error al cargar datos.</div>`
        }
    }
}

if (btnEnviarAvisoGrupo) {
    btnEnviarAvisoGrupo.addEventListener('click', () => {
        const mensaje = document.getElementById('input-aviso-grupo').value.trim()
        if (!mensaje) return alert("Escribe un mensaje de aviso para el grupo.")
        if (telefonosInscriptasActuales.length === 0) return alert("No hay alumnas con teléfono registrado en este turno.")

        const confirmar = confirm(`Por limitaciones del navegador, se abrirán los chats secuencialmente para las ${telefonosInscriptasActuales.length} inscriptas. ¿Continuar?`)
        if (!confirmar) return

        telefonosInscriptasActuales.forEach((alumna, index) => {
            const telLimpio = alumna.telefono.replace(/[^0-9]/g, '')
            const url = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`
            setTimeout(() => {
                window.open(url, '_blank')
            }, index * 1000)
        })
    })
}

function cerrarModalDetalle() { if (modalDetalleTurno) modalDetalleTurno.classList.add('hidden') }
if (btnCerrarModalDetalle) btnCerrarModalDetalle.addEventListener('click', cerrarModalDetalle)
if (btnCerrarDetalleFooter) btnCerrarDetalleFooter.addEventListener('click', cerrarModalDetalle)