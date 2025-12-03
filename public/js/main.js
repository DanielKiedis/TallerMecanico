class TallerMecanicoApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        this.setupSmoothScroll();
        this.loadUserFromStorage();
        this.setupFormSubmissions();
    }

    setupEventListeners() {
        // Menú Hamburguesa
        const menuBtn = document.querySelector('.menu-btn');
        const navMenu = document.querySelector('.nav-menu');
        
        menuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuBtn.innerHTML = navMenu.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });

        // Cerrar menú al hacer click en enlace
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });

        // Modales
        const loginBtn = document.getElementById('loginBtn');
        const menuLoginBtn = document.getElementById('menuLoginBtn');
        const loginModal = document.getElementById('loginModal');
        const closeModal = document.querySelector('.close-modal');

        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });

        if (menuLoginBtn) {
            menuLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                navMenu.classList.remove('active');
                menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        }

        closeModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && loginModal.style.display === 'flex') {
                loginModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    async loadInitialData() {
        try {
            this.showLoadingState();
            
            const endpoints = [
                '/api/info/mision-vision',
                '/api/ofertas',
                '/api/servicios',
                '/api/ubicacion',
                '/api/nosotros'
            ];
            
            const responses = await Promise.all(
                endpoints.map(url => 
                    fetch(url).then(r => {
                        if (!r.ok) throw new Error(`Error ${r.status}`);
                        return r.json();
                    })
                )
            );
            
            const [misionVision, ofertas, servicios, ubicacion, nosotros] = responses;
            
            this.renderMisionVision(misionVision);
            this.renderOfertas(ofertas);
            this.renderServicios(servicios);
            this.renderUbicacion(ubicacion);
            this.renderNosotros(nosotros);
            
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.showNotification('Error cargando datos. Por favor recarga la página.', 'error');
            this.renderFallbackData();
        }
    }

    showLoadingState() {
        document.querySelectorAll('.loading').forEach(el => {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        });
    }

    hideLoadingState() {
        document.querySelectorAll('.loading').forEach(el => {
            el.style.display = 'none';
        });
    }

    renderMisionVision(data) {
        document.getElementById('mision-text').textContent = data.mision;
        document.getElementById('vision-text').textContent = data.vision;
        document.getElementById('objetivo-text').textContent = data.objetivo;
    }

    renderOfertas(ofertas) {
        const container = document.getElementById('ofertas-container');
        if (!ofertas || ofertas.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-tag"></i>
                    <h3>Próximamente nuevas ofertas</h3>
                    <p>Vuelve pronto para ver nuestras promociones especiales</p>
                </div>
            `;
            return;
        }

        container.innerHTML = ofertas.map(oferta => `
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-percentage"></i>
                </div>
                <h3>${oferta.titulo}</h3>
                <p>${oferta.descripcion}</p>
                <div class="offer-discount">${oferta.descuento} DESCUENTO</div>
                <p class="offer-valid">Válido hasta: ${new Date(oferta.valido_hasta).toLocaleDateString('es-MX')}</p>
                <button class="btn-primary" onclick="app.solicitarOferta('${oferta.titulo}')">
                    <i class="fas fa-shopping-cart"></i> Aplicar Oferta
                </button>
            </div>
        `).join('');
    }

    renderServicios(servicios) {
        const container = document.getElementById('servicios-container');
        if (!servicios || servicios.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-tools"></i>
                    <h3>Servicios en mantenimiento</h3>
                    <p>Estamos actualizando nuestra lista de servicios</p>
                </div>
            `;
            return;
        }

        container.innerHTML = servicios.map(servicio => `
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-cog"></i>
                </div>
                <h3>${servicio.nombre}</h3>
                <p>${servicio.descripcion}</p>
                <div class="service-price">$${servicio.precio.toFixed(2)} MXN</div>
                <button class="btn-secondary" onclick="app.seleccionarServicio('${servicio.nombre}')">
                    <i class="fas fa-info-circle"></i> Más Información
                </button>
            </div>
        `).join('');
    }

    renderUbicacion(data) {
        const container = document.getElementById('ubicacion-info');
        container.innerHTML = `
            <div class="location-item">
                <h3><i class="fas fa-map-pin"></i> Dirección</h3>
                <p>${data.direccion}</p>
            </div>
            <div class="location-item">
                <h3><i class="fas fa-phone"></i> Contacto</h3>
                <p><strong>Teléfono:</strong> ${data.telefono}</p>
                <p><strong>WhatsApp:</strong> ${data.whatsapp}</p>
            </div>
            <div class="location-item">
                <h3><i class="fas fa-clock"></i> Horario</h3>
                <div>${data.horario}</div>
            </div>
            <div class="location-item">
                <h3><i class="fas fa-star"></i> Servicios Especiales</h3>
                <p>${data.servicios_especiales}</p>
            </div>
        `;
    }

    renderNosotros(data) {
        const container = document.getElementById('nosotros-info');
        container.innerHTML = `
            <div class="about-item">
                <h3><i class="fas fa-history"></i> Nuestra Historia</h3>
                <p>${data.historia}</p>
            </div>
            <div class="about-item">
                <h3><i class="fas fa-users-cog"></i> Nuestro Equipo</h3>
                <p>${data.equipo}</p>
            </div>
            <div class="about-item">
                <h3><i class="fas fa-handshake"></i> Nuestros Valores</h3>
                <div>${data.valores}</div>
            </div>
            <div class="about-item">
                <h3><i class="fas fa-award"></i> Certificaciones</h3>
                <p>${data.certificaciones}</p>
            </div>
        `;
    }

    renderFallbackData() {
        // Datos de respaldo en caso de error
        const fallbackOfertas = [
            {
                titulo: 'Mantenimiento Primaveral',
                descripcion: 'Prepara tu auto para la nueva temporada con nuestro servicio completo',
                descuento: '20%',
                valido_hasta: '2024-06-30'
            }
        ];

        const fallbackServicios = [
            {
                nombre: 'Cambio de Aceite',
                descripcion: 'Servicio básico de mantenimiento con aceite sintético',
                precio: 599.99
            }
        ];

        this.renderOfertas(fallbackOfertas);
        this.renderServicios(fallbackServicios);
    }

    setupFormSubmissions() {
        const citaForm = document.getElementById('citaForm');
        const gruaForm = document.getElementById('gruaForm');

        if (citaForm) {
            citaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitForm(citaForm, '/api/citas', 'cita');
            });
        }

        if (gruaForm) {
            gruaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitForm(gruaForm, '/api/gruas', 'grúa');
            });
        }
    }

    async submitForm(form, endpoint, type) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validación básica
        if (!this.validateFormData(data)) {
            this.showNotification('Por favor completa todos los campos correctamente', 'warning');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(
                    `${type.charAt(0).toUpperCase() + type.slice(1)} solicitada exitosamente!`, 
                    'success'
                );
                form.reset();
                
                if (type === 'cita') {
                    setTimeout(() => {
                        this.showNotification(
                            'Revisa tu correo electrónico para la confirmación de la cita',
                            'info'
                        );
                    }, 1500);
                }
            } else {
                throw new Error(result.error || 'Error en la solicitud');
            }
        } catch (error) {
            console.error(`Error solicitando ${type}:`, error);
            this.showNotification(
                `Error al solicitar ${type}. Por favor intenta de nuevo.`, 
                'error'
            );
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validateFormData(data) {
        for (const key in data) {
            if (!data[key] || data[key].trim() === '') {
                return false;
            }
        }
        
        // Validación específica para email
        if (data.correo && !this.isValidEmail(data.correo)) {
            return false;
        }
        
        // Validación específica para teléfono
        if (data.telefono && !this.isValidPhone(data.telefono)) {
            return false;
        }
        
        return true;
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    isValidPhone(phone) {
        const re = /^[\d\s\-\+\(\)]{10,20}$/;
        return re.test(phone);
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('loginError');
        const remember = document.getElementById('remember').checked;
        
        errorElement.textContent = '';
        
        if (!username || !password) {
            errorElement.textContent = 'Por favor completa todos los campos';
            return;
        }
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data;
                
                if (remember) {
                    localStorage.setItem('username', username);
                    localStorage.setItem('userToken', data.token);
                }
                
                if (data.role === 'admin') {
                    localStorage.setItem('adminToken', data.token);
                    this.showNotification(`Bienvenido administrador ${username}!`, 'success');
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1500);
                } else {
                    this.showNotification(`Bienvenido ${username}!`, 'success');
                    this.updateLoginButton(username);
                    document.getElementById('loginModal').style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            } else {
                errorElement.textContent = data.error || 'Credenciales incorrectas';
                this.shakeElement(errorElement);
            }
        } catch (error) {
            console.error('Error de login:', error);
            errorElement.textContent = 'Error de conexión con el servidor';
            this.shakeElement(errorElement);
        }
    }

    shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    updateLoginButton(username) {
        const loginBtn = document.getElementById('loginBtn');
        if (username) {
            loginBtn.innerHTML = `<i class="fas fa-user-check"></i> ${username}`;
            loginBtn.style.background = 'linear-gradient(135deg, var(--success-color), #2ecc71)';
            loginBtn.onclick = () => {
                this.showNotification(`Sesión activa como ${username}`, 'info');
            };
        }
    }

    loadUserFromStorage() {
        const username = localStorage.getItem('username');
        if (username) {
            this.updateLoginButton(username);
            this.currentUser = { username };
        }
    }

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const offset = 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const offset = 80;
            const elementPosition = section.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    showNotification(message, type = 'info') {
        // Remover notificaciones existentes
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const icon = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        }[type];
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        // Estilos inline para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : 
                        type === 'error' ? '#e74c3c' : 
                        type === 'warning' ? '#f39c12' : '#3498db'};
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
            min-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Botón para cerrar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    solicitarOferta(titulo) {
        this.showNotification(`Has seleccionado la oferta: ${titulo}`, 'info');
        this.scrollToSection('citas');
    }

    seleccionarServicio(nombre) {
        this.showNotification(`Has seleccionado el servicio: ${nombre}`, 'info');
        this.scrollToSection('citas');
    }

    openGoogleMaps() {
        this.showNotification('Abriendo Google Maps...', 'info');
        window.open('https://maps.google.com/?q=Av.+Tecnológico+1500,+Ciudad+de+México', '_blank');
    }

    openWaze() {
        this.showNotification('Abriendo Waze...', 'info');
        window.open('https://waze.com/ul?ll=19.4326,-99.1332&navigate=yes', '_blank');
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TallerMecanicoApp();
    
    // Agregar estilos para animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .shake {
            animation: shake 0.5s ease;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            margin-left: auto;
            font-size: 1rem;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        
        .notification-close:hover {
            opacity: 1;
        }
        
        .no-data {
            text-align: center;
            padding: 3rem;
            color: #666;
            grid-column: 1 / -1;
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
    `;
    document.head.appendChild(style);
});

// Funciones globales para uso en HTML
window.login = () => window.app.login();
window.scrollToSection = (sectionId) => window.app.scrollToSection(sectionId);
window.openGoogleMaps = () => window.app.openGoogleMaps();
window.openWaze = () => window.app.openWaze();