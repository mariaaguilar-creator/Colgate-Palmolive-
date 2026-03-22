import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Send, Search, X, Menu as MenuIcon, Check, Info, CreditCard, Store, Copy, TrendingUp, Calculator, MapPin, Truck, Lock, LogOut, Edit2, Eye, EyeOff, Save, Image as ImageIcon, Upload, RefreshCw, ArrowLeft, Download, FileText, Share2, ChevronDown, ChevronUp, Link, Package, Tag, DollarSign, Settings, Target, ShieldCheck, Award, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { products as initialProducts, Product as BaseProduct } from './data/products';
import { auth, db } from './firebase';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy, writeBatch, getDocs, serverTimestamp, setDoc, getDocFromServer } from 'firebase/firestore';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Try to get a non-existent document to test connection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    if (error?.code === 'unavailable') {
      console.error("Firestore is unavailable. This may be a temporary network issue or a configuration mismatch.");
    } else if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.warn("Firestore connection test result (expected if doc doesn't exist):", error?.message || error);
    }
  }
}
testConnection();

export interface Product extends BaseProduct {
  hidden?: boolean;
  priceOnHold?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  image: string;
  order?: number;
}

interface PaymentSettings {
  bank: string;
  phone: string;
  idType: 'V' | 'R' | 'P';
  idNumber: string;
  coverImage: string;
  whatsappOrderNumber: string;
  whatsappCountryCode?: string;
}

interface AboutSettings {
  mainTitle: string;
  mainSubtitle: string;
  missionTitle: string;
  missionText: string;
  whyTitle: string;
  whyText: string;
  brandsTitle: string;
  ordersTitle: string;
  ordersText: string;
  bcvTitle: string;
  bcvText: string;
}

const defaultAboutSettings: AboutSettings = {
  mainTitle: "Sobre Nosotros",
  mainSubtitle: "Calidad y confianza en cada producto para tu hogar y cuidado personal.",
  missionTitle: "Nuestra Misión",
  missionText: "Te ofrecemos exclusivamente productos originales de Colgate-Palmolive. Desde la protección anticaries líder en el mundo hasta la suavidad y limpieza de tus marcas favoritas.",
  whyTitle: "¿Por qué elegirnos?",
  whyText: "Garantizamos la autenticidad de cada artículo. Nuestra prioridad es tu bienestar y el de tu familia, brindando soluciones efectivas para el día a día.",
  brandsTitle: "Nuestras Marcas",
  ordersTitle: "Logística de Pedidos",
  ordersText: "Realizamos entregas a convenir en TODA Guacara.",
  bcvTitle: "Tasa Oficial del BCV",
  bcvText: "Nosotros cobramos a la tasa oficial del BCV"
};

const defaultPaymentSettings: PaymentSettings = {
  bank: 'BANCO MERCANTIL (0105)',
  phone: '0424-424.43.87',
  idType: 'V',
  idNumber: '27.267.152',
  coverImage: 'https://lh3.googleusercontent.com/d/1OOUHFer-bElvR3GWJGn9XWmSDRG5Q4DB',
  whatsappOrderNumber: '584244244387'
};

const VENEZUELAN_BANKS = [
  "0102 - BANCO DE VENEZUELA",
  "0105 - BANCO MERCANTIL",
  "0108 - BANCO PROVINCIAL",
  "0114 - BANCAMIGA",
  "0115 - BANCO EXTERIOR",
  "0128 - BANCO CARONÍ",
  "0134 - BANESCO",
  "0137 - BANCO SOFITASA",
  "0138 - BANCO PLAZA",
  "0151 - BFC BANCO FONDO COMÚN",
  "0156 - 100% BANCO",
  "0157 - BANCO DELSUR",
  "0163 - BANCO DEL TESORO",
  "0166 - BANCO AGRÍCOLA DE VENEZUELA",
  "0168 - BANCRECER",
  "0169 - MI BANCO",
  "0171 - BANCO ACTIVO",
  "0172 - BANCARIBE",
  "0174 - BANPLUS",
  "0175 - BANCO BICENTENARIO",
  "0177 - BANFANB",
  "0191 - BNC BANCO NACIONAL DE CRÉDITO"
];

interface CartItem extends Product {
  quantity: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (errInfo.error.includes('insufficient permissions')) {
    console.warn('Firestore Permission Error (handled):', errInfo);
    // No lanzamos error para LIST para permitir que el cache local funcione
    if (operationType === OperationType.LIST) return;
    alert('Error: No tienes permisos suficientes para realizar esta acción.');
  } else {
    alert(`Error al procesar la solicitud: ${errInfo.error}`);
  }
  
  throw new Error(JSON.stringify(errInfo));
}

function BrandsCarousel({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) return null;

  // Duplicate brands to create a seamless loop
  const duplicatedBrands = [...brands, ...brands, ...brands];

  return (
    <div className="w-full overflow-hidden py-6">
      <motion.div
        className="flex gap-8 items-center"
        animate={{
          x: [0, -112 * brands.length],
        }}
        transition={{
          duration: brands.length * 3,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{ width: "max-content" }}
      >
        {duplicatedBrands.map((brand, idx) => (
          <div 
            key={`${brand.id}-${idx}`} 
            className="flex-shrink-0 w-20 h-20 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center transition-all duration-500 group overflow-hidden"
          >
            <img
              src={brand.image}
              alt={brand.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    // Intentar cargar desde cache local para velocidad instantánea
    const cached = localStorage.getItem('firestore_products_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cached products", e);
      }
    }
    // Si no hay cache, mostrar los iniciales para que no se vea vacío
    return initialProducts.map(p => ({ ...p, hidden: false }));
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'products' | 'about' | 'payment' | 'calculator' | 'admin' | 'config'>('products');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => {
    const cached = localStorage.getItem('payment_settings_cache');
    return cached ? JSON.parse(cached) : defaultPaymentSettings;
  });
  const [aboutSettings, setAboutSettings] = useState<AboutSettings>(() => {
    const cached = localStorage.getItem('about_settings_cache');
    return cached ? JSON.parse(cached) : defaultAboutSettings;
  });
  const [editingAboutField, setEditingAboutField] = useState<keyof AboutSettings | null>(null);
  const [tempAboutValue, setTempAboutValue] = useState('');
  const [isEditingPaymentData, setIsEditingPaymentData] = useState(false);
  const [isEditingPaymentCover, setIsEditingPaymentCover] = useState(false);
  const [paymentCoverSource, setPaymentCoverSource] = useState<'url' | 'file'>('url');
  const [tempPaymentSettings, setTempPaymentSettings] = useState<PaymentSettings>(paymentSettings);
  const [calcAmount, setCalcAmount] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [calcCopied, setCalcCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => localStorage.getItem('bcv_last_update_time'));

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 4);
    if (digits.length > 4) formatted += '-' + digits.slice(4, 7);
    if (digits.length > 7) formatted += '.' + digits.slice(7, 9);
    if (digits.length > 9) formatted += '.' + digits.slice(9, 11);
    return formatted;
  };

  const formatIdNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  const [bcvRate, setBcvRate] = useState<number | null>(() => {
    const cached = localStorage.getItem('bcv_rate');
    return cached ? parseFloat(cached) : null;
  });

  // Admin State
  const [user, setUser] = useState<User | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showBrandManager, setShowBrandManager] = useState(false);

  const getBase64FromUrl = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Error fetching image for base64", e);
      return "";
    }
  };

  const exportToExcel = async (fields: string[]) => {
    setIsSyncing(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventario');

      const columns = [];
      if (fields.includes('Nombre')) columns.push({ header: 'Nombre', key: 'name', width: 30 });
      if (fields.includes('Categoría')) columns.push({ header: 'Categoría', key: 'category', width: 20 });
      if (fields.includes('Presentación')) columns.push({ header: 'CONTENIDO', key: 'size', width: 15 });
      if (fields.includes('Precio')) columns.push({ header: 'Precio', key: 'price', width: 15 });
      if (fields.includes('Descripción')) columns.push({ header: 'Descripción', key: 'description', width: 40 });
      if (fields.includes('Imagen')) columns.push({ header: 'Imagen', key: 'image', width: 25 });

      worksheet.columns = columns;

      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const rowData: any = {};
        if (fields.includes('Nombre')) rowData.name = p.name;
        if (fields.includes('Categoría')) rowData.category = p.category;
        if (fields.includes('Presentación')) rowData.size = p.size;
        if (fields.includes('Precio')) rowData.price = `$${p.price.toFixed(2)}`;
        if (fields.includes('Descripción')) rowData.description = p.description;
        
        const row = worksheet.addRow(rowData);
        
        if (fields.includes('Imagen') && p.image) {
          row.height = 80;
          try {
            const base64 = await getBase64FromUrl(p.image);
            if (base64 && base64.includes(',')) {
              const base64Data = base64.split(',')[1];
              const mimeType = base64.split(';')[0].split(':')[1];
              let extension = mimeType.split('/')[1] as any;
              
              if (extension === 'jpg') extension = 'jpeg';
              if (!['png', 'jpeg', 'gif'].includes(extension)) extension = 'png';

              const imageId = workbook.addImage({
                base64: base64Data,
                extension: extension,
              });
              const colIndex = columns.findIndex(c => c.key === 'image');
              worksheet.addImage(imageId, {
                tl: { col: colIndex, row: i + 1 },
                ext: { width: 100, height: 100 },
                editAs: 'oneCell'
              });
            }
          } catch (e) {
            console.error("Error adding image to Excel", e);
          }
        } else {
          row.height = 25;
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Inventario_Colgate_Palmolive.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToPDF = async (fields: string[]) => {
    setIsSyncing(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Inventario Colgate-Palmolive", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

      const head = [];
      if (fields.includes('Nombre')) head.push('Nombre');
      if (fields.includes('Categoría')) head.push('Categoría');
      if (fields.includes('Presentación')) head.push('Presentación');
      if (fields.includes('Precio')) head.push('Precio');
      if (fields.includes('Descripción')) head.push('Descripción');
      if (fields.includes('Imagen')) head.push('Imagen');

      const tableData = [];
      for (const p of products) {
        const row = [];
        if (fields.includes('Nombre')) row.push(p.name);
        if (fields.includes('Categoría')) row.push(p.category);
        if (fields.includes('Presentación')) row.push(p.size);
        if (fields.includes('Precio')) row.push(`$${p.price.toFixed(2)}`);
        if (fields.includes('Descripción')) row.push(p.description);
        
        let imgBase64 = '';
        if (fields.includes('Imagen') && p.image) {
          imgBase64 = await getBase64FromUrl(p.image);
        }
        if (fields.includes('Imagen')) row.push(imgBase64);
        tableData.push(row);
      }

      autoTable(doc, {
        startY: 35,
        head: [head],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138] },
        styles: { cellPadding: 2, minCellHeight: fields.includes('Imagen') ? 30 : 10 },
        didDrawCell: (data) => {
          if (data.section === 'body' && fields.includes('Imagen')) {
            const colIndex = head.indexOf('Imagen');
            if (data.column.index === colIndex) {
              const base64 = data.cell.raw as string;
              if (base64) {
                try {
                  doc.addImage(base64, 'PNG', data.cell.x + 2, data.cell.y + 2, 26, 26);
                } catch (e) {
                  console.error("Error adding image to PDF", e);
                }
              }
            }
          }
        }
      });

      doc.save("Inventario_Colgate_Palmolive.pdf");
    } catch (error) {
      console.error("Error exporting to PDF", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyForSMS = (fields: string[]) => {
    let text = "*INVENTARIO COLGATE-PALMOLIVE*\n\n";
    products.forEach(p => {
      let line = "• ";
      if (fields.includes('Nombre')) line += p.name;
      if (fields.includes('Presentación')) line += ` (${p.size})`;
      if (fields.includes('Precio')) line += ` - $${p.price.toFixed(2)}`;
      if (fields.includes('Categoría')) line += ` [${p.category}]`;
      if (fields.includes('Descripción')) line += ` - ${p.description}`;
      // Excluir imagen en SMS según solicitud del usuario
      text += line + "\n";
    });
    navigator.clipboard.writeText(text);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };
  const [loginError, setLoginError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Firestore Products Subscription
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Product[];
      
      if (productsData.length > 0) {
        setProducts(productsData);
        localStorage.setItem('products_seeded', 'true');
        localStorage.setItem('firestore_products_cache', JSON.stringify(productsData));
      } else if (localStorage.getItem('products_seeded')) {
        setProducts([]);
        localStorage.removeItem('firestore_products_cache');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, []);

  // Firestore Brands Subscription
  useEffect(() => {
    const q = query(collection(db, 'brands'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const brandsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Brand[];
      setBrands(brandsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'brands');
    });
    return () => unsubscribe();
  }, []);

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email?.toLowerCase() !== 'maam01proyectos@gmail.com') {
        signOut(auth);
        setLoginError('Acceso denegado. Solo el administrador puede ingresar.');
        setUser(null);
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as PaymentSettings;
        setPaymentSettings({ ...defaultPaymentSettings, ...data });
        localStorage.setItem('payment_settings_cache', JSON.stringify({ ...defaultPaymentSettings, ...data }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settings/payment');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'about'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AboutSettings;
        setAboutSettings({ ...defaultAboutSettings, ...data });
        localStorage.setItem('about_settings_cache', JSON.stringify({ ...defaultAboutSettings, ...data }));
      } else {
        setDoc(doc(db, 'settings', 'about'), defaultAboutSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/about');
    });
    return () => unsubscribe();
  }, []);

  // Reset scroll on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const email = adminEmail.trim().toLowerCase();
      const password = adminPassword;
      
      await signInWithEmailAndPassword(auth, email, password);
      setAdminEmail('');
      setAdminPassword('');
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setLoginError('Credenciales incorrectas. Verifique su correo y contraseña.');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('Demasiados intentos fallidos. Intente más tarde.');
      } else {
        setLoginError('Error al iniciar sesión. Intente de nuevo.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google login error:", error);
      setLoginError('Error al iniciar sesión con Google.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveView('products');
  };

  const handleEditAbout = (field: keyof AboutSettings, currentVal: string) => {
    setEditingAboutField(field);
    setTempAboutValue(currentVal);
  };

  const saveAboutEdit = async () => {
    if (!editingAboutField) return;
    try {
      await updateDoc(doc(db, 'settings', 'about'), {
        [editingAboutField]: tempAboutValue
      });
      setEditingAboutField(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/about');
    }
  };

  const savePaymentSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'payment'), tempPaymentSettings);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setIsEditingPaymentData(false);
      setIsEditingPaymentCover(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/payment');
    }
  };

  const handlePaymentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempPaymentSettings({ ...tempPaymentSettings, coverImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchRate = async () => {
      const updateRate = (rate: number) => {
        if (!rate || isNaN(rate)) return;
        setBcvRate(rate);
        const now = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        setLastUpdated(now);
        localStorage.setItem('bcv_rate', rate.toString());
        localStorage.setItem('bcv_last_update', new Date().toISOString());
        localStorage.setItem('bcv_last_update_time', now);
      };

      try {
        // Intentar primero a través de nuestro proxy para evitar CORS
        const res = await fetch('/api/rates');
        if (res.ok) {
          const result = await res.json();
          const { source, data } = result;
          let rate: number | null = null;
          
          if (source === 'dolarapi_bcv') {
            rate = data.valor || data.promedio;
          } else if (source === 'dolarapi_all') {
            const bcv = data.find((i: any) => i.nombre === 'BCV' || i.id === 'bcv');
            rate = bcv?.valor || bcv?.promedio;
          } else if (source === 'pydolarve') {
            rate = data?.monitors?.bcv?.price || data?.price;
          } else if (source === 'exchangerate') {
            rate = data?.rates?.VES;
          }

          if (rate && !isNaN(rate)) {
            updateRate(rate);
            return;
          }
        }
      } catch (e) {
        // Silenciamos el error del proxy ya que intentaremos el fallback
      }

      // Fallback a fetch directo (puede fallar por CORS en el navegador, pero es el último recurso)
      const sources = [
        'https://ve.dolarapi.com/v1/dolares/bcv',
        'https://ve.dolarapi.com/v1/dolares',
        'https://pydolarve.org/api/v1/dollar?page=bcv',
        'https://api.exchangerate-api.com/v4/latest/USD'
      ];

      for (const source of sources) {
        try {
          const res = await fetch(source, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) continue;
          
          const data = await res.json();
          let rate: number | null = null;
          
          if (source.includes('dolarapi.com/v1/dolares/bcv')) {
            rate = data.valor || data.promedio;
          } else if (source.includes('dolarapi.com/v1/dolares')) {
            const bcv = data.find((i: any) => i.nombre === 'BCV' || i.id === 'bcv');
            rate = bcv?.valor || bcv?.promedio;
          } else if (source.includes('pydolarve.org')) {
            rate = data?.monitors?.bcv?.price || data?.price;
          } else if (source.includes('exchangerate-api.com')) {
            rate = data?.rates?.VES;
          }

          if (rate && !isNaN(rate)) {
            updateRate(rate);
            break;
          }
        } catch (e) {
          // Ignorar errores de fallback individual
        }
      }
    };
    fetchRate();
    const interval = setInterval(fetchRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredProducts = products.filter(p => !p.hidden && !p.priceOnHold);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const sendOrder = () => {
    const phoneNumber = paymentSettings.whatsappOrderNumber.replace(/\D/g, '');
    let message = '¡Hola! Me gustaría realizar el siguiente pedido:\n\n';
    
    cart.forEach(item => {
      message += `• ${item.name} (${item.size}) x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\n*Total a pagar: $${cartTotal.toFixed(2)}*`;
    message += `\n*Total en Bs (BCV): Bs. ${(cartTotal * (bcvRate || 60.00)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`;
    
    if (bcvRate) {
      message += `\n\n_Tasa BCV del día: Bs. ${bcvRate.toFixed(2)}_`;
    } else {
      message += `\n\n_Tasa BCV: Bs. 60.00_`;
    }
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
  };

  const goHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsCartOpen(false);
    setActiveView('products');
  };

  const copyPaymentData = () => {
    const data = `Banco: ${paymentSettings.bank}\nTeléfono: ${paymentSettings.phone}\nCédula: V-${paymentSettings.idNumber}`;
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCalcResult = () => {
    if (!bcvRate) return;
    const total = (parseFloat(calcAmount || '0') * (bcvRate || 60.00)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    navigator.clipboard.writeText(`Bs. ${total}`);
    setCalcCopied(true);
    setTimeout(() => setCalcCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Sticky Header Wrapper */}
      <div className="sticky top-0 z-50">
        {/* Banner Logic */}
        {(() => {
          const bcvBanner = (
            <a 
              href="https://www.bcv.org.ve" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-blue-900 text-white py-2 px-4 flex items-center justify-center gap-4 border-b border-blue-800/50 hover:bg-blue-950 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Tasa Oficial BCV</span>
                </div>
                
                <div className="h-4 w-[1px] bg-blue-700/50"></div>

                <span className="text-xs sm:text-sm font-black tracking-wider flex items-center gap-1">
                  <span className="text-blue-300 font-bold">Bs.</span>
                  {bcvRate ? bcvRate.toFixed(2) : '...'}
                </span>
              </div>
            </a>
          );

          return (
            <>
              {activeView === 'products' && bcvBanner}
              {user && activeView !== 'products' && (
                <div className="bg-emerald-500 text-white py-2 px-4 flex items-center justify-center gap-2 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </div>
                  SESIÓN ACTIVA - {user.displayName || user.email || 'ADMINISTRADOR'}
                </div>
              )}
            </>
          );
        })()}

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 sm:p-2 text-blue-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MenuIcon size={22} className="sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={goHome}
              className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-sm border border-slate-100">
                <img 
                  src="https://lh3.googleusercontent.com/d/1Kwg-JePUR7s7tSQ7iNA_nsuZ9DCElss2" 
                  alt="Logo Colgate-Palmolive" 
                  className="w-full h-full object-contain p-1"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-blue-900 whitespace-nowrap">Colgate-Palmolive</h1>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
              <TrendingUp size={14} className="text-blue-600" />
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">BCV: </span>
              <span className="text-xs font-black text-blue-600">
                {bcvRate ? `Bs. ${bcvRate.toFixed(2)}` : 'Actualizando...'}
              </span>
            </div>
            
            {activeView !== 'admin' && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-blue-900 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-900 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
    </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeView === 'products' ? (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map(product => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={product.id}
                      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                    >
            <div 
              className="aspect-square relative overflow-hidden bg-slate-50 cursor-pointer group/img"
              onClick={() => setSelectedImage(product.image)}
            >
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-2 sm:p-4 group-hover/img:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold text-blue-900 border border-blue-100">
                {product.size}
              </div>
            </div>
                      
                      <div className="p-3 sm:p-5 flex-1 flex flex-col">
                        <div className="mb-1 sm:mb-2">
                          <h3 className="font-bold text-blue-900 text-xs sm:text-base line-clamp-2 leading-tight h-8 sm:h-10">
                            {product.name}
                          </h3>
                        </div>
                        
                        <p className="text-[10px] sm:text-sm text-blue-800 line-clamp-2 mb-2 sm:mb-4 flex-1">
                          {product.description}
                        </p>
                        
                        <div className="mt-auto pt-2 sm:pt-4">
                          <div className="flex flex-col mb-2 sm:mb-3">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm sm:text-xl font-black text-blue-900">
                                ${product.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] sm:text-xs font-bold text-blue-600">
                                Bs. {(product.price * (bcvRate || 60.00)).toFixed(2)}
                              </span>
                            </div>
                            {cart.find(item => item.id === product.id) && (
                              <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-blue-900 mt-0.5 sm:mt-1 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                                <span>Cant: {cart.find(item => item.id === product.id)?.quantity}</span>
                                <span>Sub: ${(product.price * (cart.find(item => item.id === product.id)?.quantity || 0)).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {cart.find(item => item.id === product.id) ? (
                              <>
                                <button
                                  onClick={() => {
                                    const item = cart.find(i => i.id === product.id);
                                    if (item && item.quantity > 1) {
                                      updateQuantity(product.id, -1);
                                    } else {
                                      removeFromCart(product.id);
                                    }
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-blue-900 p-3 rounded-xl sm:rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                                >
                                  <Minus size={18} className="sm:w-6 sm:h-6" />
                                </button>
                                <button
                                  onClick={() => addToCart(product)}
                                  className="flex-1 bg-blue-900 text-white py-3 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                  <Plus size={18} className="sm:w-6 sm:h-6" />
                                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">Añadir</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => addToCart(product)}
                                className="w-full bg-blue-900 hover:bg-blue-950 text-white py-3 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                <Plus size={18} className="sm:w-6 sm:h-6" />
                                <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">Añadir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4 text-slate-400">
                    <MenuIcon size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">No hay productos en esta categoría</h3>
                  <p className="text-blue-800">Selecciona otra categoría para ver más productos</p>
                </div>
              )}
            </motion.div>
          ) : activeView === 'about' ? (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-blue-900 p-6 text-white flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                    <Store size={24} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] truncate">
                      {aboutSettings.mainTitle}
                    </h2>
                    <p className="text-blue-200 text-xs font-medium truncate">
                      {aboutSettings.mainSubtitle}
                    </p>
                  </div>
                  {user && (
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleEditAbout('mainSubtitle', aboutSettings.mainSubtitle)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                        title="Editar Subtítulo"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-6 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 group">
                        <Target className="text-blue-600" size={20} />
                        {aboutSettings.missionTitle}
                      </h3>
                      <div className="relative group">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {aboutSettings.missionText}
                        </p>
                        {user && (
                          <button 
                            onClick={() => handleEditAbout('missionText', aboutSettings.missionText)}
                            className="absolute -top-1 -right-1 p-1 bg-white shadow-sm rounded-full text-blue-400 hover:text-blue-600 transition-opacity border border-slate-100"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 group">
                        <ShieldCheck className="text-blue-600" size={20} />
                        {aboutSettings.whyTitle}
                      </h3>
                      <div className="relative group">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {aboutSettings.whyText}
                        </p>
                        {user && (
                          <button 
                            onClick={() => handleEditAbout('whyText', aboutSettings.whyText)}
                            className="absolute -top-1 -right-1 p-1 bg-white shadow-sm rounded-full text-blue-400 hover:text-blue-600 transition-opacity border border-slate-100"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between group">
                        <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                          <Award className="text-blue-600" size={20} />
                          {aboutSettings.brandsTitle}
                        </h3>
                        {user && (
                          <button 
                            onClick={() => setShowBrandManager(true)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm border border-blue-100"
                            title="Gestionar Marcas"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                      <BrandsCarousel brands={brands} />
                    </div>

                    <div className="pt-8 border-t border-slate-100 space-y-3">
                      <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 group">
                        <Package className="text-blue-600" size={20} />
                        {aboutSettings.ordersTitle}
                      </h3>
                      <div className="relative group">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {aboutSettings.ordersText}
                        </p>
                        {user && (
                          <button 
                            onClick={() => handleEditAbout('ordersText', aboutSettings.ordersText)}
                            className="absolute -top-1 -right-1 p-1 bg-white shadow-sm rounded-full text-blue-400 hover:text-blue-600 transition-opacity border border-slate-100"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 space-y-3">
                      <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 group">
                        <DollarSign className="text-blue-600" size={20} />
                        {aboutSettings.bcvTitle}
                      </h3>
                      <div className="relative group">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {aboutSettings.bcvText}
                        </p>
                        {user && (
                          <button 
                            onClick={() => handleEditAbout('bcvText', aboutSettings.bcvText)}
                            className="absolute -top-1 -right-1 p-1 bg-white shadow-sm rounded-full text-blue-400 hover:text-blue-600 transition-opacity border border-slate-100"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
                    <button 
                      onClick={() => setActiveView('products')}
                      className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-950 transition-all active:scale-95 shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      Ir al Inicio
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeView === 'payment' ? (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                <div className="relative h-32 bg-blue-900">
                  <img 
                    src={paymentSettings.coverImage} 
                    alt="Pago Móvil Portada" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  {user && (
                    <button
                      onClick={() => {
                        setTempPaymentSettings(paymentSettings);
                        setIsEditingPaymentCover(true);
                      }}
                      className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition-all z-10"
                      title="Editar Portada"
                    >
                      <ImageIcon size={18} />
                    </button>
                  )}
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-blue-900 tracking-tight">Pago Móvil</h2>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4 relative group">
                    {user && (
                      <button
                        onClick={() => {
                          setTempPaymentSettings(paymentSettings);
                          setIsEditingPaymentData(true);
                        }}
                        className="absolute right-4 top-4 p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all"
                        title="Editar Datos"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <div className="grid gap-4">
                      <div>
                        <p className="text-[10px] tracking-widest font-black text-blue-400 mb-0.5">Banco</p>
                        <p className="text-blue-900 font-black text-base uppercase">{paymentSettings.bank}</p>
                      </div>
                      <div>
                        <p className="text-[10px] tracking-widest font-black text-blue-400 mb-0.5">Teléfono</p>
                        <p className="text-blue-900 font-black text-base">{paymentSettings.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] tracking-widest font-black text-blue-400 mb-0.5">Cédula de Identidad</p>
                        <p className="text-blue-900 font-black text-base uppercase">V-{paymentSettings.idNumber}</p>
                      </div>
                    </div>
                    
                    {bcvRate && (
                      <div className="pt-4 border-t border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-blue-400" />
                          <p className="text-[10px] tracking-widest font-black text-blue-400">Tasa BCV del día</p>
                        </div>
                        <p className="text-blue-600 font-black text-base">Bs. {bcvRate.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={copyPaymentData}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${
                        copied 
                          ? 'bg-emerald-500 text-white shadow-emerald-100' 
                          : 'bg-blue-900 hover:bg-blue-950 text-white shadow-blue-100'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={18} />
                          <span className="text-base">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          <span className="text-base">Copiar datos</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-400 text-center leading-relaxed font-medium">
                      Recuerde enviar el capture del pago de su pedido por WhatsApp para procesar su entrega.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeView === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              {!user ? (
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                  <div className="bg-blue-900 p-6 text-white flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                      <Lock size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight">Portal Admin</h2>
                      <p className="text-blue-200 text-xs font-medium">Credenciales Requeridas</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleLogin} className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-blue-900/40 ml-2">Correo Electrónico</label>
                        <input
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-blue-900 font-bold focus:border-blue-900 focus:outline-none transition-all placeholder:text-slate-200"
                          placeholder="ejemplo@correo.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-blue-900/40 ml-2">Contraseña</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 pr-14 text-blue-900 font-bold focus:border-blue-900 focus:outline-none transition-all placeholder:text-slate-200"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-900 transition-colors"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {loginError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 text-red-500 p-4 rounded-xl text-xs font-bold text-center border border-red-100"
                      >
                        {loginError}
                      </motion.div>
                    )}

                    <div className="space-y-4">
                      <button
                        type="submit"
                        className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold text-base hover:bg-blue-950 transition-all active:scale-95 shadow-lg shadow-blue-100"
                      >
                        Iniciar Sesión
                      </button>
                      
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-black text-slate-300"><span className="bg-white px-4">O continuar con</span></div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full bg-white border-2 border-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
                      >
                        <img 
                          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                          alt="Google" 
                          className="w-5 h-5" 
                        />
                        Google Account
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <AdminDashboard 
                  products={products} 
                  brands={brands}
                  onLogout={handleLogout} 
                  isSyncing={isSyncing}
                  setIsSyncing={setIsSyncing}
                  onSuccess={() => {
                    setShowSuccessToast(true);
                    setTimeout(() => setShowSuccessToast(false), 3000);
                  }}
                  user={user}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-blue-900 p-6 text-white flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                    <Calculator size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Calculadora</h2>
                    <p className="text-blue-200 text-xs font-medium">Convierte USD a Bolívar al instante</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-blue-900/40 ml-2">Monto en Divisas (USD)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-900 font-black text-2xl">$</span>
                      <input
                        type="number"
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-3xl font-black text-blue-900 focus:border-blue-900 focus:outline-none transition-all placeholder:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 space-y-4">
                    <div className="flex items-center justify-between text-blue-400">
                      <span className="text-[10px] uppercase tracking-widest font-black">Tasa Oficial BCV</span>
                      <span className="font-black text-xs">Bs. {(bcvRate || 60.00).toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest font-black text-blue-900/40">Total en Bolívares</p>
                      <p className="text-3xl font-black text-blue-900 break-all">
                        Bs. {(parseFloat(calcAmount || '0') * (bcvRate || 60.00)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {!bcvRate && (
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3">
                      <Info size={20} className="text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700 font-bold">Error al cargar tasa BCV.</p>
                    </div>
                  )}

                  <button
                    onClick={copyCalcResult}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
                      calcCopied 
                        ? 'bg-emerald-500 text-white shadow-emerald-100' 
                        : 'bg-blue-900 text-white shadow-blue-100 hover:bg-blue-950'
                    }`}
                  >
                    {calcCopied ? (
                      <>
                        <Check size={20} />
                        <span className="text-base">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={20} />
                        <span className="text-base">Copiar monto en Bs.</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-blue-200 transition-colors p-2"
              >
                <X size={32} />
              </button>
              <img
                src={selectedImage}
                alt="Product Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white p-4"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-blue-900" />
                  <h2 className="text-xl font-bold text-blue-900">Carrito</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <ShoppingCart size={40} />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900">Tu carrito está vacío</h3>
                      <p className="text-blue-800 text-sm">¡Agrega algunos productos para comenzar!</p>
                    </div>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl flex-shrink-0 overflow-hidden border border-slate-100">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-blue-900 text-sm line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-blue-800 mb-2">{item.size}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-2 py-1 border border-slate-100">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 hover:text-blue-900 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold w-4 text-center text-blue-900">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 hover:text-blue-900 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-blue-900">${(item.price * item.quantity).toFixed(2)}</span>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                {cart.length > 0 && (
                  <>
                    <div className="flex flex-col gap-1 mb-2">
                      <div className="flex items-center justify-between text-lg">
                        <span className="text-blue-800 font-bold">Total</span>
                        <span className="font-black text-2xl text-blue-900">${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">Total en Bs (BCV)</span>
                        <span className="font-bold text-blue-600">
                          Bs. {(cartTotal * (bcvRate || 60.00)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={sendOrder}
                      className="w-full bg-blue-900 hover:bg-blue-950 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                    >
                      <Send size={20} />
                      Enviar pedido al WhatsApp
                    </button>
                  </>
                )}


                
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-white border-2 border-blue-900 text-blue-900 py-3.5 rounded-2xl font-bold hover:bg-blue-50 transition-all active:scale-[0.98]"
                >
                  Seguir añadiendo al carrito
                </button>

                {cart.length > 0 && (
                  <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold pt-1">
                    TASA OFICIAL DEL BCV - ENTREGA A CONVENIR
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Cart Button for Mobile */}
      {cartCount > 0 && !isCartOpen && activeView !== 'admin' && (
        <motion.button
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-900 text-white p-4 rounded-full shadow-2xl shadow-blue-300 flex items-center gap-2 md:hidden"
        >
          <ShoppingCart size={24} />
          <span className="font-bold">{cartCount}</span>
        </motion.button>
      )}

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-full max-w-[280px] bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-blue-900">Menú</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <button 
                  onClick={() => { setActiveView('about'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-medium ${activeView === 'about' ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-900'}`}
                >
                  <Store size={20} />
                  Sobre Nosotros
                </button>
                <button 
                  onClick={() => { setActiveView('products'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-medium ${activeView === 'products' ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-900'}`}
                >
                  <ShoppingCart size={20} />
                  Productos
                </button>
                <button 
                  onClick={() => { setActiveView('payment'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-medium ${activeView === 'payment' ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-900'}`}
                >
                  <CreditCard size={20} />
                  Pago Móvil
                </button>
                <button 
                  onClick={() => { setActiveView('calculator'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-medium ${activeView === 'calculator' ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-900'}`}
                >
                  <Calculator size={20} />
                  Calculadora
                </button>
                {user && (
                  <button 
                    onClick={() => { setActiveView('config'); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-medium ${activeView === 'config' ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-900'}`}
                  >
                    <Settings size={20} />
                    Configuración
                  </button>
                )}
              </div>
              <div className="mt-auto p-4 border-t border-slate-100 space-y-4">
                <button 
                  onClick={() => { setActiveView('admin'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-bold border-2 ${
                    activeView === 'admin' 
                      ? 'bg-blue-900 text-white border-blue-900' 
                      : 'text-blue-900 border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  <Lock size={20} />
                  Administrador
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Edición de Datos de Pago Móvil */}
      <AnimatePresence>
        {isEditingPaymentData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Edit2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Editar Datos</h3>
                    <p className="text-xs text-slate-500">Actualice la información de pago</p>
                  </div>
                </div>
                <button onClick={() => setIsEditingPaymentData(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 bg-white">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Banco</label>
                    <div className="relative">
                      <select
                        value={tempPaymentSettings.bank}
                        onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, bank: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Seleccionar Banco</option>
                        {VENEZUELAN_BANKS.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Teléfono</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={tempPaymentSettings.phone}
                      onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, phone: formatPhone(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
                      placeholder="Ej: 0424-424.43.87"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Cédula de Identidad</label>
                    <div className="flex gap-2">
                      <div className="w-12 bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-800 flex items-center justify-center">
                        V
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={tempPaymentSettings.idNumber}
                        onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, idNumber: formatIdNumber(e.target.value) })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
                        placeholder="Ej: 27.267.152"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditingPaymentData(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={savePaymentSettings}
                    className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-950 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edición de Portada de Pago Móvil */}
      <AnimatePresence>
        {isEditingPaymentCover && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Editar Portada</h3>
                    <p className="text-xs text-slate-500">Cambie la imagen de Pago Móvil</p>
                  </div>
                </div>
                <button onClick={() => setIsEditingPaymentCover(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 bg-white">
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <ImageIcon size={18} className="text-blue-500" />
                      <span className="text-sm font-semibold leading-tight">Imagen de<br/>Portada</span>
                    </div>
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPaymentCoverSource('url')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${paymentCoverSource === 'url' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentCoverSource('file')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${paymentCoverSource === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        ARCHIVO
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      {paymentCoverSource === 'url' ? (
                        <input
                          type="url"
                          value={tempPaymentSettings.coverImage?.startsWith('data:') ? '' : tempPaymentSettings.coverImage}
                          onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, coverImage: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm text-slate-800 focus:border-blue-500 focus:outline-none transition-all"
                          placeholder="https://enlace-de-imagen.com"
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePaymentFileChange}
                            className="hidden"
                            id="payment-cover-file"
                          />
                          <label
                            htmlFor="payment-cover-file"
                            className="w-full bg-white border border-dashed border-slate-300 rounded-xl py-3 px-4 text-slate-500 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-all"
                          >
                            <Upload size={16} />
                            <span>Subir imagen</span>
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {tempPaymentSettings.coverImage ? (
                        <img src={tempPaymentSettings.coverImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={20} className="text-slate-200" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditingPaymentCover(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={savePaymentSettings}
                    className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-950 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-[200] bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] shadow-2xl flex items-center justify-center gap-3 border-2 border-white/20 min-w-[180px] whitespace-nowrap"
          >
            <Check size={14} className="flex-shrink-0" />
            <span>Cambios Guardados</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeView === 'config' && (
          <ConfigPage 
            paymentSettings={paymentSettings}
            onSaveSettings={async (settings) => {
              setIsSyncing(true);
              try {
                await setDoc(doc(db, 'settings', 'payment'), settings);
                setPaymentSettings(settings);
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, 'settings/payment');
              } finally {
                setIsSyncing(false);
              }
            }}
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            onCopySMS={copyForSMS}
            onClose={() => setActiveView('products')}
            isSyncing={isSyncing}
            products={products}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBrandManager && (
          <BrandManager 
            brands={brands}
            onClose={() => setShowBrandManager(false)}
            setIsSyncing={setIsSyncing}
            onSuccess={() => {
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 3000);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingAboutField && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-blue-900 uppercase tracking-widest text-sm">Editar Sección</h3>
                <button onClick={() => setEditingAboutField(null)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Contenido</label>
                  {editingAboutField.toLowerCase().includes('text') ? (
                    <textarea 
                      value={tempAboutValue}
                      onChange={(e) => setTempAboutValue(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:border-blue-500 focus:outline-none transition-all resize-none"
                    />
                  ) : (
                    <input 
                      type="text"
                      value={tempAboutValue}
                      onChange={(e) => setTempAboutValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-all"
                    />
                  )}
                </div>
                <button 
                  onClick={saveAboutEdit}
                  className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-950 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  <Save size={18} />
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfigPage({ 
  paymentSettings, 
  onSaveSettings, 
  onExportExcel, 
  onExportPDF, 
  onCopySMS, 
  onClose,
  isSyncing,
  products
}: {
  paymentSettings: PaymentSettings,
  onSaveSettings: (settings: PaymentSettings) => Promise<void>,
  onExportExcel: (fields: string[]) => void,
  onExportPDF: (fields: string[]) => void,
  onCopySMS: (fields: string[]) => void,
  onClose: () => void,
  isSyncing: boolean,
  products: Product[]
}) {
  const [whatsappNumber, setWhatsappNumber] = useState(paymentSettings.whatsappOrderNumber);
  const [countryCode, setCountryCode] = useState(paymentSettings.whatsappCountryCode || '+58');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(['Nombre', 'Precio', 'Categoría', 'Presentación', 'Imagen']);

  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 8) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}.${digits.slice(6, 8)}.${digits.slice(8, 10)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsappNumber(formatted);
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const combinedNumber = countryCode.replace('+', '') + whatsappNumber.replace(/\D/g, '');
      await onSaveSettings({ ...paymentSettings, whatsappOrderNumber: combinedNumber, whatsappCountryCode: countryCode });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const exportFields = [
    { id: 'Nombre', label: 'Nombre' },
    { id: 'Precio', label: 'Precio' },
    { id: 'Categoría', label: 'Categoría' },
    { id: 'Presentación', label: 'CONTENIDO' },
    { id: 'Descripción', label: 'Descripción' },
    { id: 'Imagen', label: 'Imagen' }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-blue-900 tracking-tight uppercase">Configuración</h2>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Ajustes del administrador</p>
        </div>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* WhatsApp Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Send size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-900 uppercase">WhatsApp de Pedidos</h3>
                <p className="text-[10px] text-slate-400 font-bold">Número que recibe los pedidos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative group flex-1 flex gap-2">
                <select 
                  value={countryCode} 
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-2 text-blue-900 font-bold focus:border-blue-900 focus:outline-none transition-all"
                >
                  <option value="+58">🇻🇪 +58</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+57">🇨🇴 +57</option>
                </select>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={handleWhatsAppChange}
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-6 pr-16 text-blue-900 font-bold focus:border-blue-900 focus:outline-none transition-all"
                  placeholder="000-000.00.00"
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving || isSyncing}
                  className="absolute right-2 top-2 bottom-2 bg-blue-900 text-white px-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-950 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Extraer Datos Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-900 uppercase">Extraer Datos</h3>
                <p className="text-[10px] text-slate-400 font-bold">Exportar inventario</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
              <p className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest ml-2">Seleccionar campos:</p>
              <div className="grid grid-cols-2 gap-3">
                {exportFields.map(field => (
                  <button
                    key={field.id}
                    onClick={() => toggleField(field.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all border-2 h-14 overflow-hidden ${
                      selectedFields.includes(field.id) 
                        ? 'bg-white border-blue-900 text-blue-900 shadow-sm' 
                        : 'bg-white/50 border-transparent text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                      selectedFields.includes(field.id) ? 'bg-blue-900 text-white' : 'bg-slate-100'
                    }`}>
                      {selectedFields.includes(field.id) && <Check size={12} strokeWidth={4} />}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tight text-left leading-tight truncate">{field.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => onExportExcel(selectedFields)}
                disabled={selectedFields.length === 0}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl transition-all group disabled:opacity-50"
              >
                <FileText size={20} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest">Excel</span>
              </button>
              <button 
                onClick={() => onExportPDF(selectedFields)}
                disabled={selectedFields.length === 0}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all group disabled:opacity-50"
              >
                <FileText size={20} className="text-red-500" />
                <span className="text-[9px] font-black uppercase tracking-widest">PDF</span>
              </button>
              <button 
                onClick={() => onCopySMS(selectedFields)}
                disabled={selectedFields.length === 0}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all group disabled:opacity-50"
              >
                <Send size={20} className="text-blue-500" />
                <span className="text-[9px] font-black uppercase tracking-widest">SMS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableBrandItem({ brand, onEdit, onDelete, onMove }: { 
  brand: Brand, 
  onEdit: (b: any) => void, 
  onDelete: (id: string) => any,
  onMove: (id: string, direction: 'up' | 'down') => void,
  key?: any
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: brand.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-3 ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/20 z-50' : 'hover:shadow-lg hover:shadow-blue-900/5'}`}
    >
      {/* Up/Down Buttons */}
      <div className="flex flex-col gap-0.5 mr-2">
        <button
          onClick={() => onMove(brand.id, 'up')}
          className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ChevronUp size={18} />
        </button>
        <button
          onClick={() => onMove(brand.id, 'down')}
          className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Brand Info */}
      <div 
        {...attributes}
        {...listeners}
        className="flex-1 flex items-center gap-4 cursor-grab active:cursor-grabbing"
      >
        <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 flex-shrink-0">
          <img src={brand.image} alt={brand.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
        </div>
        <span className="font-bold text-blue-900">{brand.name}</span>
      </div>

      {/* Actions - Right aligned */}
      <div className="flex items-center gap-1 ml-auto">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(brand); }}
          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
          title="Editar"
        >
          <Edit2 size={18} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(brand.id); }}
          className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
          title="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function BrandManager({ brands, onClose, setIsSyncing, onSuccess }: {
  brands: Brand[],
  onClose: () => void,
  setIsSyncing: (s: boolean) => void,
  onSuccess: () => void
}) {
  const [editingBrand, setEditingBrand] = useState<Partial<Brand> | null>(null);
  const [imageSource, setImageSource] = useState<'url' | 'file'>('url');
  const [localBrands, setLocalBrands] = useState<Brand[]>(brands);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null);

  useEffect(() => {
    setLocalBrands(brands);
  }, [brands]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = localBrands.findIndex((b) => b.id === active.id);
      const newIndex = localBrands.findIndex((b) => b.id === over.id);
      
      const newBrands = arrayMove(localBrands, oldIndex, newIndex);
      setLocalBrands(newBrands);
      
      setIsSyncing(true);
      try {
        const batch = writeBatch(db);
        newBrands.forEach((brand: Brand, index: number) => {
          batch.update(doc(db, 'brands', brand.id), { order: index });
        });
        await batch.commit();
        onSuccess();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'brands');
        // Revert local state on error
        setLocalBrands(brands);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = localBrands.findIndex((b) => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === localBrands.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newBrands = arrayMove(localBrands, index, newIndex);
    setLocalBrands(newBrands);
    
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      newBrands.forEach((brand: Brand, index: number) => {
        batch.update(doc(db, 'brands', brand.id), { order: index });
      });
      await batch.commit();
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'brands');
      setLocalBrands(brands);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBrand) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingBrand({ ...editingBrand, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand?.name || !editingBrand?.image) return;

    setIsSyncing(true);
    try {
      if (editingBrand.id) {
        const { id, ...data } = editingBrand;
        await updateDoc(doc(db, 'brands', id), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'brands'), {
          ...editingBrand,
          order: brands.length,
          createdAt: serverTimestamp()
        });
      }
      setEditingBrand(null);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'brands');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteBrand = (id: string) => {
    setBrandToDelete(id);
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, 'brands', brandToDelete));
      setBrandToDelete(null);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `brands/${brandToDelete}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* Header - Matching ProductEditor */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Gestionar Marcas</h3>
              <p className="text-xs text-slate-500">Configuración del carrusel de marcas</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-white">
          {editingBrand ? (
            <form onSubmit={saveBrand} className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Nombre de la Marca *</label>
                  <input
                    type="text"
                    required
                    value={editingBrand.name || ''}
                    onChange={e => setEditingBrand({ ...editingBrand, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all placeholder:text-slate-400"
                    placeholder="Ej: Colgate"
                  />
                </div>

                {/* Image Section - No box for visual relief */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <ImageIcon size={18} className="text-blue-500" />
                      <span className="text-sm font-semibold uppercase tracking-wider">Logo de Marca</span>
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setImageSource('url')}
                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${imageSource === 'url' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSource('file')}
                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${imageSource === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        ARCHIVO
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="flex-1 space-y-4">
                      {imageSource === 'url' ? (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Enlace de imagen</p>
                          <input
                            type="url"
                            value={editingBrand.image?.startsWith('data:') ? '' : editingBrand.image}
                            onChange={(e) => setEditingBrand({ ...editingBrand, image: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                            placeholder="https://..."
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Archivo local</p>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                              id="brand-logo-file"
                            />
                            <label
                              htmlFor="brand-logo-file"
                              className="w-full bg-white border border-dashed border-slate-300 rounded-xl py-3 px-4 text-slate-500 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-all"
                            >
                              <Upload size={16} />
                              <span>Subir logo</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full sm:w-32 h-32 bg-white rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                      {editingBrand.image ? (
                        <img src={editingBrand.image} alt="Preview" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-300">
                          <ImageIcon size={32} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Vista Previa</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Buttons below the image section */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setEditingBrand(null)} 
                    className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  {editingBrand.id && (
                    <button 
                      type="button" 
                      onClick={() => deleteBrand(editingBrand.id!)} 
                      className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
                  >
                    {editingBrand.id ? 'Actualizar' : 'Añadir'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setEditingBrand({ name: '', image: '' })}
              className="w-full py-8 border-2 border-dashed border-blue-100 rounded-2xl text-blue-400 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 hover:border-blue-300 transition-all flex flex-col items-center gap-3 group"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              Añadir Nueva Marca
            </button>
          )}

          <div className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localBrands.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {localBrands.map(brand => (
                  <SortableBrandItem 
                    key={brand.id} 
                    brand={brand} 
                    onEdit={setEditingBrand} 
                    onDelete={deleteBrand} 
                    onMove={handleMove}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <div className="flex items-center gap-4 bg-white border border-blue-200 rounded-2xl p-3 shadow-2xl opacity-90 scale-105 ring-2 ring-blue-500/20">
                    <div className="p-2 text-blue-500 flex-shrink-0">
                      <GripVertical size={20} />
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 flex-shrink-0">
                      <img src={localBrands.find(b => b.id === activeId)?.image} alt="" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{localBrands.find(b => b.id === activeId)?.name}</p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        {/* Modal de Confirmación de Eliminación de Marca */}
        <AnimatePresence>
          {brandToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center border border-slate-100"
              >
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-xl font-black text-blue-900 mb-2 uppercase tracking-tight">¿Eliminar Marca?</h3>
                <p className="text-slate-500 text-sm mb-8 font-medium">Esta acción eliminará la marca del carrusel principal y no se puede deshacer.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBrandToDelete(null)}
                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteBrand}
                    className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                  >
                    Aceptar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function AdminDashboard({ 
  products, 
  brands, 
  onLogout, 
  isSyncing, 
  setIsSyncing, 
  onSuccess, 
  user
}: { 
  products: Product[], 
  brands: Brand[],
  onLogout: () => void,
  isSyncing: boolean,
  setIsSyncing: (s: boolean) => void,
  onSuccess: () => void,
  user: User | null
}) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

      {/* Modal de Confirmación de Eliminación */}
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = adminFilter === 'all' || 
                         (adminFilter === 'visible' && !p.hidden) || 
                         (adminFilter === 'hidden' && p.hidden);
    return matchesSearch && matchesFilter;
  });

  const toggleVisibility = async (product: Product) => {
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'products', product.id);
      await updateDoc(docRef, { hidden: !product.hidden, updatedAt: serverTimestamp() });
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const duplicateProduct = async (product: Product) => {
    setIsSyncing(true);
    try {
      const { id, ...productData } = product;
      const newProduct = {
        ...productData,
        name: `${product.name} (Copia)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'products'), newProduct);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, 'products', productToDelete));
      setProductToDelete(null);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productToDelete}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-40">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Lock size={120} />
            </div>
            <div className="relative z-10 space-y-6">
              <div>
                <div className="flex items-center gap-4 mb-1">
                  <h2 className="text-xl font-black uppercase tracking-tight leading-none">Panel de Control</h2>
                  <button
                    onClick={onLogout}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all active:scale-95 group"
                    title="Cerrar Sesión"
                  >
                    <LogOut size={18} className="text-white group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em]">GESTIÓN DE INVENTARIO</p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button 
                  onClick={() => setAdminFilter('all')}
                  className={`text-center transition-all hover:scale-110 active:scale-95 ${adminFilter === 'all' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                >
                  <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black">{products.length}</p>
                </button>
                <button 
                  onClick={() => setAdminFilter('visible')}
                  className={`text-center transition-all hover:scale-110 active:scale-95 ${adminFilter === 'visible' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                >
                  <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Visibles</p>
                  <p className="text-2xl font-black">{products.filter(p => !p.hidden).length}</p>
                </button>
                <button 
                  onClick={() => setAdminFilter('hidden')}
                  className={`text-center transition-all hover:scale-110 active:scale-95 ${adminFilter === 'hidden' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                >
                  <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Ocultos</p>
                  <p className="text-2xl font-black">{products.filter(p => p.hidden).length}</p>
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setEditingProduct({ id: '', name: '', description: '', size: '', price: 0, image: '', category: 'Cuidado Personal', hidden: false })}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20 active:scale-95"
                >
                  <Plus size={20} strokeWidth={3} />
                  Nuevo Producto
                </button>
              </div>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-900/30 group-focus-within:text-blue-900 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-6 text-blue-900 font-bold focus:border-blue-900 focus:outline-none transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-sm placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-6">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Search size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">Sin resultados</h3>
                <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto">
                  No pudimos encontrar productos que coincidan con "{searchTerm}".
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredProducts.map(product => (
                      <div 
                        key={product.id} 
                        onClick={() => setEditingProduct(product)}
                        className={`bg-white p-4 rounded-[2rem] border-2 transition-all hover:shadow-2xl hover:shadow-blue-900/10 group relative cursor-pointer flex flex-col md:flex-row items-center gap-4 ${product.hidden ? 'border-amber-100 bg-amber-50/20 opacity-80' : 'border-slate-100 hover:border-blue-200'}`}
                      >
                        {/* Status Badge */}
                        {product.hidden && (
                          <div className="absolute -top-3 left-8 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm z-10 bg-amber-500 text-white">
                            Oculto
                          </div>
                        )}

                        <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-2xl overflow-hidden border border-slate-50 flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500 relative">
                          <img src={product.image} alt={product.name} className={`w-full h-full object-contain p-2 ${product.hidden ? 'grayscale opacity-50' : ''}`} referrerPolicy="no-referrer" />
                          {product.hidden && (
                            <div className="absolute inset-0 flex items-center justify-center bg-amber-900/5">
                              <EyeOff size={24} className="text-amber-500/30" />
                            </div>
                          )}
                        </div>
                      
                        <div className="flex-1 text-center md:text-left space-y-1">
                          {/* Quick Edit Overlay */}
                          <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/[0.02] transition-colors rounded-[2rem] pointer-events-none" />
                          <div className="absolute top-4 right-16 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 bg-blue-900 text-white text-[7px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-xl z-20 hidden md:block">
                            Click para editar
                          </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded-full border border-blue-100/50">
                            {product.category}
                          </span>
                          {product.hidden && (
                            <span className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-100/50">
                              <EyeOff size={8} strokeWidth={3} /> Oculto
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-blue-900 text-sm tracking-tight leading-tight">{product.name}</h3>
                        <p className="text-slate-400 text-[10px] font-medium line-clamp-1 max-w-xl leading-relaxed">{product.description}</p>
                        <div className="flex items-center justify-center md:justify-start gap-3 pt-0.5">
                          <div className="bg-slate-50 px-2 py-0.5 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                            {product.size}
                          </div>
                          {product.priceOnHold ? (
                            <span className="text-xs font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100 animate-pulse">
                              PRECIO EN ESPERA
                            </span>
                          ) : (
                            <span className="text-lg font-black text-blue-600 tracking-tighter">${product.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>

                      <div className="hidden md:block w-px h-16 bg-slate-100 mx-1" />
                      <div className="md:hidden w-full h-px bg-slate-100 my-1" />

                      <div className="flex md:flex-col items-center gap-4 relative z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleVisibility(product)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                          title={product.hidden ? "Mostrar" : "Ocultar"}
                        >
                          {product.hidden ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                        </button>
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                          title="Editar"
                        >
                          <Edit2 size={20} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => duplicateProduct(product)}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all active:scale-90"
                          title="Duplicar"
                        >
                          <Copy size={20} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => setProductToDelete(product.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                          title="Eliminar"
                        >
                          <Trash2 size={20} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-sm rounded-[2rem] p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-blue-900 mb-2 uppercase tracking-tight">¿Eliminar Producto?</h3>
              <p className="text-slate-500 text-sm mb-8 font-medium">Esta acción no se puede deshacer y el producto desaparecerá de la tienda para siempre.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProduct && (
          <ProductEditor 
            product={editingProduct} 
            onClose={() => setEditingProduct(null)} 
            setIsSyncing={setIsSyncing}
            onSuccess={onSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductEditor({ product, onClose, setIsSyncing, onSuccess }: { 
  product: Product, 
  onClose: () => void,
  setIsSyncing: (s: boolean) => void,
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState<Partial<Product>>(product);
  const [isSaving, setIsSaving] = useState(false);
  const [imageSource, setImageSource] = useState<'url' | 'file'>('url');
  const [priceInput, setPriceInput] = useState(product.price ? (product.price * 100).toString() : '0');

  const categories = [
    "Cuidado Bucal",
    "Cuidado Personal",
    "Limpieza del Hogar",
    "Cuidado del Cabello",
    "Desodorantes",
    "Jabones",
    "Cuidado del Bebé",
    "Cuidado de la Ropa",
    "Fragancias",
    "Otros"
  ];

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setPriceInput(value);
    const numericValue = parseFloat(value) / 100;
    setFormData({ ...formData, price: numericValue });
  };

  const formatPrice = (value: string) => {
    const numericValue = parseFloat(value) / 100;
    return numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación más robusta
    if (!formData.name?.trim()) {
      alert('El nombre del producto es obligatorio');
      return;
    }
    
    const price = typeof formData.price === 'number' ? formData.price : parseFloat(String(formData.price));
    if (isNaN(price) || price < 0) {
      alert('El precio debe ser un número válido mayor o igual a 0');
      return;
    }

    setIsSaving(true);
    setIsSyncing(true);
    try {
      const dataToSave = {
        name: formData.name.trim(),
        price: price,
        description: formData.description?.trim() || '',
        size: formData.size?.trim() || '',
        image: formData.image || 'https://picsum.photos/seed/product/400/400',
        category: formData.category || 'Otros',
        hidden: formData.hidden ?? false,
        priceOnHold: formData.priceOnHold ?? false,
        updatedAt: serverTimestamp()
      };

      if (product.id) {
        const docRef = doc(db, 'products', product.id);
        await updateDoc(docRef, dataToSave);
      } else {
        await addDoc(collection(db, 'products'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      handleFirestoreError(error, product.id ? OperationType.UPDATE : OperationType.CREATE, product.id ? `products/${product.id}` : 'products');
    } finally {
      setIsSaving(false);
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* Header - Simpler and cleaner */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              {product.id ? <Edit2 size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {product.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <p className="text-xs text-slate-500">Complete los detalles del producto</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Nombre del Producto *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all placeholder:text-slate-400"
                placeholder="Ej: Crema Dental Colgate"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Categoría</label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Seleccionar Categoría</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Presentación / Tamaño</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all placeholder:text-slate-400"
                placeholder="Ej: 150ml / 3 Unidades"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Precio (USD) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <input
                  type="text"
                  required
                  disabled={formData.priceOnHold}
                  value={formatPrice(priceInput)}
                  onChange={handlePriceChange}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-slate-800 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all ${formData.priceOnHold ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              <div className="flex items-center gap-2 mt-2 ml-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, priceOnHold: !formData.priceOnHold })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${formData.priceOnHold ? 'bg-orange-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.priceOnHold ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  {formData.priceOnHold ? (
                    <>
                      <TrendingUp size={12} className="text-orange-500" />
                      Precio en espera
                    </>
                  ) : (
                    'Definir precio'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1">Descripción</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all resize-none placeholder:text-slate-400"
              placeholder="Detalles del producto..."
            />
          </div>

          {/* Image Section - More prominent preview */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <ImageIcon size={18} className="text-blue-500" />
                <span className="text-sm font-semibold uppercase tracking-wider">Imagen del Producto</span>
              </div>
              <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setImageSource('url')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${imageSource === 'url' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageSource('file')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${imageSource === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  ARCHIVO
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              <div className="flex-1 space-y-4">
                {imageSource === 'url' ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Enlace de imagen</p>
                    <input
                      type="url"
                      value={formData.image?.startsWith('data:') ? '' : formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Archivo local</p>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="product-image-file"
                      />
                      <label
                        htmlFor="product-image-file"
                        className="w-full bg-white border-2 border-dashed border-slate-200 rounded-xl py-6 px-4 text-slate-500 text-sm font-bold flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/30 transition-all shadow-sm group"
                      >
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <Upload size={20} />
                        </div>
                        <span>Seleccionar Imagen</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-full sm:w-32 h-32 bg-white rounded-2xl border-2 border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner group relative">
                {formData.image ? (
                  <>
                    <img src={formData.image} alt="Preview" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-[8px] font-black text-white uppercase tracking-widest">Vista Previa</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-200">
                    <ImageIcon size={32} />
                    <span className="text-[8px] font-black uppercase">Sin Imagen</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                <span>{product.id ? 'Guardar Cambios' : 'Crear Producto'}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
