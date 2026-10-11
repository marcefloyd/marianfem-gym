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
    navDashboard.addEventListener('click', (e) => {
        e.preventDefault()
        cambiarVista('dashboard')
    })
}

if (navRegistrar) {
    navRegistrar.addEventListener('click', (e) => {
        e.preventDefault()
        cambiarVista('registrar')
    })
}

// 4. CARGAR DATOS Y MÉTRICAS DESDE SUPABASE
async function cargarDatosDashboard() {
    await cargarClasesSupabase()
    await cargarMetricasClientas()
}

async function cargarClasesSupabase() {
    try {
        const { data, error } = await supabase
            .from('gimnasio_clases')
            .select('*')
            .order('horario', { ascending: true })

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

        const tdHora = document.createElement('td')
        tdHora.className = "py-3 px-3 font-bold text-white"
        tdHora.textContent = clase.horario

        const tdDisc = document.createElement('td')
        tdDisc.className = "py-3 px-3 text-zinc-300"
        tdDisc.innerHTML = `${clase.nombre}<br><span class="text-xs text-pink-500 font-normal">${clase.categoria || 'Entrenamiento'}</span>`

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

function actualizarContadorTurnosHoy(clases) {
    const contadorEl = document.getElementById('turnos-hoy-count')
    const estadoEl = document.getElementById('turnos-estado')
    
    const totalClases = clases ? clases.length : 0
    if (contadorEl) contadorEl.textContent = `${totalClases} Clases`
    if (estadoEl) {
        estadoEl.textContent = totalClases > 0 ? "Programadas" : "Sin clases"
        estadoEl.className = totalClases > 0 ? "text-xs text-emerald-400 font-bold" : "text-xs text-zinc-500 font-bold"
    }
}

async function cargarMetricasClientas() {
    try {
        const { data: clientas, error } = await supabase
            .from('gimnasio_clientas')
            .select('*')

        if (error) {
            console.log("Tabla de clientas pendiente de creación en Supabase:", error.message)
            return
        }

        let activas = clientas.length
        let cantBase = clientas.filter(c => c.plan === 'base').length
        let cantPro = clientas.filter(c => c.plan === 'pro').length
        let gananciaTotal = (cantBase * 30) + (cantPro * 50)

        document.getElementById('total-clientas-activas').textContent = activas
        document.getElementById('ganancia-estimada').textContent = `$ ${gananciaTotal} USD`
        document.getElementById('cant-base').textContent = cantBase
        document.getElementById('cant-pro').textContent = cantPro

    } catch (err) {
        console.error("Error al calcular métricas de clientas:", err)
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
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            })

            if (authError) throw authError

            const { error: dbError } = await supabase
                .from('gimnasio_clientas')
                .insert([
                    { 
                        user_id: authData.user.id, 
                        nombre, 
                        dni, 
                        telefono, 
                        plan, 
                        email, 
                        ficha_medica: ficha 
                    }
                ])

            if (dbError) throw dbError

            alert(`¡Clienta ${nombre} registrada con éxito!`)
            formRegistrar.reset()
            cambiarVista('dashboard')
            cargarMetricasClientas()

        } catch (err) {
            alert("Error al registrar clienta: " + err.message)
            console.error(err)
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
        modalClase.classList.remove('hidden')
    })
}

function cerrarModalClase() {
    if (modalClase) {
        modalClase.classList.add('hidden')
        if (formCrearClase) formCrearClase.reset()
    }
}

if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalClase)
if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalClase)

if (formCrearClase) {
    formCrearClase.addEventListener('submit', async (e) => {
        e.preventDefault()

        const horario = document.getElementById('clase-horario').value
        const nombre = document.getElementById('clase-nombre').value
        const categoria = document.getElementById('clase-categoria').value
        const totales = parseInt(document.getElementById('clase-totales').value)

        try {
            const { error } = await supabase
                .from('gimnasio_clases')
                .insert([
                    { 
                        horario, 
                        nombre, 
                        categoria, 
                        totales, 
                        ocupados: 0 
                    }
                ])

            if (error) throw error

            alert("¡Clase agregada con éxito al cronograma!")
            cerrarModalClase()
            cargarClasesSupabase()

        } catch (err) {
            alert("Error al guardar la clase: " + err.message)
            console.error(err)
        }
    })
}

// 7. CONTROL DEL MENÚ RESPONSIVE EN CELULARES
const sidebarMovil = document.getElementById('sidebar-movil')
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')
const btnCerrarSidebar = document.getElementById('btn-cerrar-sidebar')

if (btnToggleSidebar && sidebarMovil) {
    btnToggleSidebar.addEventListener('click', () => {
        sidebarMovil.classList.toggle('-translate-x-full')
    })
}

if (btnCerrarSidebar && sidebarMovil) {
    btnCerrarSidebar.addEventListener('click', () => {
        sidebarMovil.classList.add('-translate-x-full')
    })
}

const navLinks = document.querySelectorAll('aside nav a')
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth < 768 && sidebarMovil) {
            sidebarMovil.classList.add('-translate-x-full')
        }
    })
})