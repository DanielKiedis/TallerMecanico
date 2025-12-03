class AdminApp {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.username = localStorage.getItem('username') || 'Administrador';
        this.data = {
            usuarios: [],
            citas: [],
            gruas: []
        };
        this.init();
    }

    async init() {
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        this.setupEventListeners();
        await this.loadData();
        this.setupAutoRefresh();
        this.updateAdminInfo();
    }

    redirectToLogin() {
        alert('Sesión expirada. Por favor inicia sesión nuevamente.');
        localStorage.clear();
        window.location.href = 'index.html';
    }

    setupEventListeners() {
        // Formulario de usuario
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createUser();
        });

        // Filtros
        document.getElementById('citasFilter').addEventListener('change', () => this.filterCitas());
        document.getElementById('gruasFilter').addEventListener('change', () => this.filterGruas());
    }

    updateAdminInfo() {
        document.getElementById('adminName').textContent = this.username;
        document.getElementById('lastAccess').textContent = new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async loadData() {
        try {
            const [usuarios, citas, gruas] = await Promise.all([
                this.fetchData('/api/admin/usuarios'),
                this.fetchData('/api/admin/citas'),
                this.fetchData('/api/admin/gruas')
            ]);

            this.data = { usuarios, citas, gruas };
            this.renderAll();
            this.updateStats();

        } catch (error) {
            console.error('Error cargando datos:', error);
            this.showMessage('Error cargando datos. Verifica tu conexión.', 'error');
            setTimeout(() => this.loadData(), 5000);
        }
    }

    async fetchData(endpoint) {
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': this.token
            }
        });

        if (response.status === 403) {
            this.redirectToLogin();
            throw new Error('Acceso no autorizado');
        }

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    renderAll() {
        this.renderUsuarios();
        this.renderCitas();
        this.renderGruas();
    }

    renderUsuarios() {
        const container = document.getElementById('usuariosTable');
        if (!this.data.usuarios || this.data.usuarios.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-users"></i>
                    <h3>No hay usuarios registrados</h3>
                    <p>Crea el primer usuario usando el botón "Nuevo Usuario"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.usuarios.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>
                                <div class="user-info">
                                    <i class="fas fa-user"></i>
                                    <span>${user.username}</span>
                                </div>
                            </td>
                            <td>
                                <span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">
                                    <i class="fas fa-${user.role === 'admin' ? 'crown' : 'user'}"></i>
                                    ${user.role}
                                </span>
                            </td>
                            <td class="actions">
                                <button class="btn-icon" onclick="adminApp.editUser(${user.id})" ${user.role === 'admin' ? 'disabled' : ''}>
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon btn-danger" onclick="adminApp.deleteUser(${user.id})" ${user.role === 'admin' ? 'disabled' : ''}>
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderCitas(filter = 'all') {
        const container = document.getElementById('citasTable');
        let citas = this.data.citas;

        switch (filter) {
            case 'today':
                const today = new Date().toISOString().split('T')[0];
                citas = citas.filter(c => c.fecha.startsWith(today));
                break;
            case 'pending':
                citas = citas.filter(c => c.estado === 'pendiente');
                break;
            case 'confirmed':
                citas = citas.filter(c => c.estado === 'confirmada');
                break;
        }

        if (!citas || citas.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No hay citas ${this.getFilterText(filter)}</h3>
                    <p>${filter === 'all' ? 'Cuando los clientes agenden citas, aparecerán aquí.' : 'Intenta con otro filtro.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Vehículo</th>
                        <th>Contacto</th>
                        <th>Descripción</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${citas.map(cita => `
                        <tr>
                            <td>
                                <div class="client-info">
                                    <strong>${cita.nombre}</strong>
                                </div>
                            </td>
                            <td>
                                <div class="vehicle-info">
                                    <i class="fas fa-car"></i>
                                    <span>${cita.marca_carro} ${cita.modelo_carro}</span>
                                    <small>(${cita.año_carro})</small>
                                </div>
                            </td>
                            <td>
                                <div class="contact-info">
                                    <div><i class="fas fa-phone"></i> ${cita.telefono}</div>
                                    <div><i class="fas fa-envelope"></i> ${cita.correo}</div>
                                </div>
                            </td>
                            <td class="description-cell">
                                <div class="description">${cita.descripcion}</div>
                            </td>
                            <td>
                                <select class="status-select" onchange="adminApp.updateCitaStatus(${cita.id}, this.value)" data-id="${cita.id}">
                                    <option value="pendiente" ${cita.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                    <option value="confirmada" ${cita.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                                    <option value="completada" ${cita.estado === 'completada' ? 'selected' : ''}>Completada</option>
                                    <option value="cancelada" ${cita.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                                </select>
                            </td>
                            <td>
                                <div class="date-info">
                                    <div>${new Date(cita.fecha).toLocaleDateString()}</div>
                                    <small>${new Date(cita.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                                </div>
                            </td>
                            <td class="actions">
                                <button class="btn-icon btn-info" onclick="adminApp.viewCita(${cita.id})" title="Ver detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon btn-warning" onclick="adminApp.sendReminder(${cita.id})" title="Enviar recordatorio">
                                    <i class="fas fa-bell"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderGruas(filter = 'all') {
        const container = document.getElementById('gruasTable');
        let gruas = this.data.gruas;

        switch (filter) {
            case 'pending':
                gruas = gruas.filter(g => g.estado === 'pendiente');
                break;
            case 'en_camino':
                gruas = gruas.filter(g => g.estado === 'en_camino');
                break;
            case 'completed':
                gruas = gruas.filter(g => g.estado === 'completada');
                break;
        }

        if (!gruas || gruas.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-truck"></i>
                    <h3>No hay solicitudes de grúa ${this.getFilterText(filter)}</h3>
                    <p>${filter === 'all' ? 'Cuando los clientes soliciten grúas, aparecerán aquí.' : 'Intenta con otro filtro.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Vehículo</th>
                        <th>Ubicación</th>
                        <th>Falla</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${gruas.map(grua => `
                        <tr>
                            <td>
                                <div class="client-info">
                                    <strong>${grua.nombre}</strong>
                                    <div><small><i class="fas fa-phone"></i> ${grua.telefono}</small></div>
                                </div>
                            </td>
                            <td>
                                <div class="vehicle-info">
                                    <i class="fas fa-car"></i>
                                    <span>${grua.marca_carro} ${grua.modelo_carro}</span>
                                </div>
                            </td>
                            <td class="location-cell">
                                <div class="location">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${grua.ubicacion}</span>
                                </div>
                            </td>
                            <td class="description-cell">
                                <div class="description">${grua.descripcion_falla}</div>
                            </td>
                            <td>
                                <select class="status-select" onchange="adminApp.updateGruaStatus(${grua.id}, this.value)">
                                    <option value="pendiente" ${grua.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                    <option value="en_camino" ${grua.estado === 'en_camino' ? 'selected' : ''}>En Camino</option>
                                    <option value="completada" ${grua.estado === 'completada' ? 'selected' : ''}>Completada</option>
                                    <option value="cancelada" ${grua.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                                </select>
                            </td>
                            <td>
                                <div class="date-info">
                                    <div>${new Date(grua.fecha).toLocaleDateString()}</div>
                                    <small>${new Date(grua.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                                </div>
                            </td>
                            <td class="actions">
                                <button class="btn-icon btn-info" onclick="adminApp.viewGrua(${grua.id})" title="Ver detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon btn-success" onclick="adminApp.callClient(${grua.id})" title="Llamar al cliente">
                                    <i class="fas fa-phone"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    getFilterText(filter) {
        const texts = {
            'all': '',
            'today': 'de hoy',
            'pending': 'pendientes',
            'confirmed': 'confirmadas',
            'en_camino': 'en camino',
            'completed': 'completadas'
        };
        return texts[filter] || '';
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const citasHoy = this.data.citas.filter(c => c.fecha.startsWith(today)).length;
        const gruasPendientes = this.data.gruas.filter(g => g.estado === 'pendiente').length;
        const usuariosActivos = this.data.usuarios.length;
        
        document.getElementById('citasHoy').textContent = citasHoy;
        document.getElementById('gruasPendientes').textContent = gruasPendientes;
        document.getElementById('usuariosActivos').textContent = usuariosActivos;
        
        // Simular datos de ingresos (en un sistema real vendría de una API)
        const ingresosHoy = citasHoy * 1500 + gruasPendientes * 800;
        document.getElementById('ingresosHoy').textContent = ingresosHoy.toLocaleString();
    }

    filterCitas() {
        const filter = document.getElementById('citasFilter').value;
        this.renderCitas(filter);
    }

    filterGruas() {
        const filter = document.getElementById('gruasFilter').value;
        this.renderGruas(filter);
    }

    async createUser() {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/admin/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showMessage('Usuario creado exitosamente', 'success');
                this.closeUserModal();
                await this.loadData();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error creando usuario');
            }
        } catch (error) {
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    async updateCitaStatus(id, estado) {
        try {
            const response = await fetch(`/api/admin/citas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token
                },
                body: JSON.stringify({ estado })
            });

            if (response.ok) {
                this.showMessage('Estado de cita actualizado', 'success');
                await this.loadData();
            }
        } catch (error) {
            this.showMessage('Error actualizando estado', 'error');
        }
    }

    async updateGruaStatus(id, estado) {
        try {
            const response = await fetch(`/api/admin/gruas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token
                },
                body: JSON.stringify({ estado })
            });

            if (response.ok) {
                this.showMessage('Estado de grúa actualizado', 'success');
                await this.loadData();
            }
        } catch (error) {
            this.showMessage('Error actualizando estado', 'error');
        }
    }

    async deleteUser(id) {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;

        try {
            const response = await fetch(`/api/admin/usuarios/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': this.token
                }
            });

            if (response.ok) {
                this.showMessage('Usuario eliminado exitosamente', 'success');
                await this.loadData();
            }
        } catch (error) {
            this.showMessage('Error eliminando usuario', 'error');
        }
    }

    viewCita(id) {
        const cita = this.data.citas.find(c => c.id == id);
        if (!cita) return;

        const modalContent = document.getElementById('detailContent');
        modalContent.innerHTML = `
            <h2><i class="fas fa-calendar-alt"></i> Detalles de la Cita</h2>
            <div class="detail-grid">
                <div class="detail-item">
                    <h3><i class="fas fa-user"></i> Cliente</h3>
                    <p><strong>Nombre:</strong> ${cita.nombre}</p>
                    <p><strong>Teléfono:</strong> ${cita.telefono}</p>
                    <p><strong>Correo:</strong> ${cita.correo}</p>
                </div>
                <div class="detail-item">
                    <h3><i class="fas fa-car"></i> Vehículo</h3>
                    <p><strong>Marca:</strong> ${cita.marca_carro}</p>
                    <p><strong>Modelo:</strong> ${cita.modelo_carro}</p>
                    <p><strong>Año:</strong> ${cita.año_carro}</p>
                </div>
                <div class="detail-item full-width">
                    <h3><i class="fas fa-file-alt"></i> Descripción del Servicio</h3>
                    <p>${cita.descripcion}</p>
                </div>
                <div class="detail-item">
                    <h3><i class="fas fa-info-circle"></i> Información de la Cita</h3>
                    <p><strong>Estado:</strong> ${cita.estado}</p>
                    <p><strong>Fecha:</strong> ${new Date(cita.fecha).toLocaleString()}</p>
                    <p><strong>ID:</strong> ${cita.id}</p>
                </div>
            </div>
            <div class="detail-actions">
                <button class="btn-primary" onclick="adminApp.printCita(${id})">
                    <i class="fas fa-print"></i> Imprimir
                </button>
                <button class="btn-secondary" onclick="adminApp.sendEmail(${id})">
                    <i class="fas fa-envelope"></i> Reenviar Email
                </button>
            </div>
        `;

        document.getElementById('detailModal').style.display = 'flex';
    }

    viewGrua(id) {
        const grua = this.data.gruas.find(g => g.id == id);
        if (!grua) return;

        const modalContent = document.getElementById('detailContent');
        modalContent.innerHTML = `
            <h2><i class="fas fa-truck-pickup"></i> Detalles de la Grúa</h2>
            <div class="detail-grid">
                <div class="detail-item">
                    <h3><i class="fas fa-user"></i> Cliente</h3>
                    <p><strong>Nombre:</strong> ${grua.nombre}</p>
                    <p><strong>Teléfono:</strong> ${grua.telefono}</p>
                    <p><strong>Correo:</strong> ${grua.correo}</p>
                </div>
                <div class="detail-item">
                    <h3><i class="fas fa-car"></i> Vehículo</h3>
                    <p><strong>Marca:</strong> ${grua.marca_carro}</p>
                    <p><strong>Modelo:</strong> ${grua.modelo_carro}</p>
                    <p><strong>Año:</strong> ${grua.año_carro}</p>
                </div>
                <div class="detail-item">
                    <h3><i class="fas fa-map-marker-alt"></i> Ubicación</h3>
                    <p>${grua.ubicacion}</p>
                </div>
                <div class="detail-item">
                    <h3><i class="fas fa-info-circle"></i> Información</h3>
                    <p><strong>Estado:</strong> ${grua.estado}</p>
                    <p><strong>Fecha:</strong> ${new Date(grua.fecha).toLocaleString()}</p>
                    <p><strong>ID:</strong> ${grua.id}</p>
                </div>
                <div class="detail-item full-width">
                    <h3><i class="fas fa-exclamation-triangle"></i> Descripción de la Falla</h3>
                    <p>${grua.descripcion_falla}</p>
                </div>
            </div>
            <div class="detail-actions">
                <button class="btn-emergency" onclick="adminApp.dispatchGrua(${id})">
                    <i class="fas fa-truck"></i> Despachar Grúa
                </button>
                <button class="btn-primary" onclick="adminApp.callClient(${id})">
                    <i class="fas fa-phone"></i> Llamar Cliente
                </button>
            </div>
        `;

        document.getElementById('detailModal').style.display = 'flex';
    }

    showUserModal() {
        document.getElementById('userModal').style.display = 'flex';
    }

    closeUserModal() {
        document.getElementById('userModal').style.display = 'none';
        document.getElementById('userForm').reset();
    }

    closeDetailModal() {
        document.getElementById('detailModal').style.display = 'none';
    }

    showMessage(message, type) {
        // Crear notificación similar al main.js
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            z-index: 3000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    setupAutoRefresh() {
        setInterval(() => {
            this.loadData();
        }, 30000); // Refrescar cada 30 segundos
    }

    logout() {
        if (confirm('¿Estás seguro de cerrar sesión?')) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    }

    // Métodos simulados para demostración
    sendReminder(id) {
        this.showMessage('Recordatorio enviado al cliente', 'info');
    }

    callClient(id) {
        this.showMessage('Llamando al cliente...', 'info');
    }

    printCita(id) {
        this.showMessage('Imprimiendo cita...', 'info');
        window.print();
    }

    sendEmail(id) {
        this.showMessage('Email reenviado al cliente', 'success');
    }

    dispatchGrua(id) {
        this.showMessage('Grúa despachada al destino', 'success');
        this.updateGruaStatus(id, 'en_camino');
    }

    editUser(id) {
        this.showMessage('Función de edición en desarrollo', 'info');
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
    
    // Agregar estilos para admin
    const style = document.createElement('style');
    style.textContent = `
        .admin-header {
            background: linear-gradient(135deg, var(--primary-color), #34495e);
            color: white;
            padding: 2.5rem;
            border-radius: var(--border-radius);
            margin-bottom: 2.5rem;
            position: relative;
            overflow: hidden;
        }
        
        .admin-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 60%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
        }
        
        .admin-header h1 {
            font-size: 2.2rem;
            margin-bottom: 0.5rem;
        }
        
        .admin-header p {
            opacity: 0.9;
            margin-bottom: 1.5rem;
        }
        
        .admin-info {
            display: flex;
            gap: 2rem;
            flex-wrap: wrap;
            background: rgba(255, 255, 255, 0.1);
            padding: 1rem 1.5rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .admin-info p {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }
        
        .stat-card {
            background: white;
            border-radius: var(--border-radius);
            padding: 1.8rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            box-shadow: var(--shadow);
            transition: var(--transition);
            border: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-hover);
        }
        
        .stat-icon {
            font-size: 2.5rem;
            color: var(--accent-color);
            background: rgba(52, 152, 219, 0.1);
            width: 70px;
            height: 70px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .stat-content h3 {
            color: var(--primary-color);
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 0.3rem;
        }
        
        .stat-change {
            font-size: 0.9rem;
            color: #666;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .stat-change i {
            color: var(--success-color);
        }
        
        .admin-grid {
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
        }
        
        .admin-section {
            background: white;
            border-radius: var(--border-radius);
            padding: 2rem;
            box-shadow: var(--shadow);
        }
        
        .admin-section.full-width {
            grid-column: 1 / -1;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .section-header h2 {
            color: var(--primary-color);
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.5rem;
        }
        
        .filter-options select {
            padding: 0.7rem 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            background: white;
            color: var(--primary-color);
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
        }
        
        .filter-options select:focus {
            outline: none;
            border-color: var(--accent-color);
        }
        
        .table-container {
            overflow-x: auto;
            margin-top: 1rem;
            border-radius: 8px;
            border: 1px solid #eee;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 800px;
        }
        
        .data-table th {
            background: var(--primary-color);
            color: white;
            padding: 1.2rem;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        
        .data-table td {
            padding: 1.2rem;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }
        
        .data-table tr:hover {
            background: #f8f9fa;
        }
        
        .user-info, .client-info, .vehicle-info, .contact-info {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .user-info i, .vehicle-info i {
            color: var(--accent-color);
            margin-right: 8px;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .badge-admin {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
        }
        
        .badge-user {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
        }
        
        .badge-mecanico {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }
        
        .badge-recepcion {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
        }
        
        .status-select {
            padding: 0.5rem;
            border: 2px solid #ddd;
            border-radius: 6px;
            background: white;
            color: var(--primary-color);
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            min-width: 120px;
        }
        
        .status-select:focus {
            outline: none;
            border-color: var(--accent-color);
        }
        
        .description-cell, .location-cell {
            max-width: 250px;
        }
        
        .description, .location {
            max-height: 60px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }
        
        .date-info {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        
        .date-info small {
            color: #666;
            font-size: 0.85rem;
        }
        
        .actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .btn-icon {
            background: none;
            border: none;
            padding: 0.6rem;
            cursor: pointer;
            font-size: 1rem;
            border-radius: 6px;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 36px;
            min-height: 36px;
        }
        
        .btn-icon:hover {
            transform: translateY(-2px);
        }
        
        .btn-icon:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn-icon.btn-info {
            color: var(--accent-color);
            background: rgba(52, 152, 219, 0.1);
        }
        
        .btn-icon.btn-info:hover {
            background: rgba(52, 152, 219, 0.2);
        }
        
        .btn-icon.btn-warning {
            color: var(--warning-color);
            background: rgba(243, 156, 18, 0.1);
        }
        
        .btn-icon.btn-warning:hover {
            background: rgba(243, 156, 18, 0.2);
        }
        
        .btn-icon.btn-success {
            color: var(--success-color);
            background: rgba(46, 204, 113, 0.1);
        }
        
        .btn-icon.btn-success:hover {
            background: rgba(46, 204, 113, 0.2);
        }
        
        .btn-icon.btn-danger {
            color: var(--secondary-color);
            background: rgba(231, 76, 60, 0.1);
        }
        
        .btn-icon.btn-danger:hover {
            background: rgba(231, 76, 60, 0.2);
        }
        
        .reports-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin-top: 1.5rem;
        }
        
        .report-card {
            background: #f8f9fa;
            border-radius: var(--border-radius);
            padding: 1.5rem;
        }
        
        .report-card h3 {
            color: var(--primary-color);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .chart-placeholder {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            text-align: center;
            color: #666;
            border: 2px dashed #ddd;
        }
        
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        
        .detail-item {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid var(--accent-color);
        }
        
        .detail-item.full-width {
            grid-column: 1 / -1;
        }
        
        .detail-item h3 {
            color: var(--primary-color);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .detail-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            padding-top: 1.5rem;
            border-top: 1px solid #eee;
        }
        
        .no-data {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        
        .no-data i {
            font-size: 3rem;
            color: var(--accent-color);
            margin-bottom: 1rem;
        }
        
        .no-data h3 {
            color: var(--primary-color);
            margin-bottom: 0.5rem;
        }
        
        @media (max-width: 768px) {
            .admin-header {
                padding: 1.5rem;
            }
            
            .admin-header h1 {
                font-size: 1.8rem;
            }
            
            .admin-info {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .section-header {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .reports-grid {
                grid-template-columns: 1fr;
            }
            
            .detail-actions {
                flex-direction: column;
            }
            
            .detail-actions button {
                width: 100%;
            }
        }
        
        @media print {
            .navbar, .admin-header, .stats-grid, .section-header button, .filter-options, .actions, .detail-actions {
                display: none !important;
            }
            
            .container {
                margin: 0;
                padding: 0;
            }
            
            .admin-section {
                box-shadow: none;
                border: 1px solid #ddd;
            }
            
            .data-table {
                min-width: auto;
            }
        }
    `;
    document.head.appendChild(style);
});