import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4 bg-white shadow flex justify-between items-center">
        <h1 className="font-bold text-lg">Bossystock</h1>
        <div className="flex gap-2">
          {session && <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">ออก</button>}
          <button onClick={() => setShowAdmin(!showAdmin)} className="bg-gray-800 text-white px-3 py-1 rounded">
            {showAdmin ? 'ไปที่หน้าร้าน' : 'เข้าสู่ระบบหลังบ้าน'}
          </button>
        </div>
      </nav>

      {showAdmin && !session ? (
        <div className="p-6"><Login onLoginSuccess={() => window.location.reload()} /></div>
      ) : (
        <MainShopSystem showAdmin={showAdmin} />
      )}
    </div>
  );
}

function MainShopSystem({ showAdmin }) {
  const [timeRange, setTimeRange] = useState('today');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [members, setMembers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [password, setPassword] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, cost: 0, stock_quantity: 0, image_url: '', category: '' });
  const [restockAmounts, setRestockAmounts] = useState({});

  // States สำหรับระบบเช็คแต้มหน้าบ้าน
  const [showPointModal, setShowPointModal] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [checkTime, setCheckTime] = useState('');
  const [memberResult, setMemberResult] = useState(null);

  // States สำหรับหลังบ้านจัดการสมาชิก
  const [selectedMemberForAction, setSelectedMemberForAction] = useState(null);
  const [pointActionType, setPointActionType] = useState('add'); 
  const [pointInput, setPointInput] = useState('');
  const [pointReason, setPointReason] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState(null);

  const [webConfig, setWebConfig] = useState({
    announcement: "ยินดีต้อนรับสู่ร้าน Bossystock สินค้าพร้อมส่งเพียบ!",
    showAnnouncement: true,
    showPopupAlert: true,
    showSearchBox: true,
    hideProductsAndCategories: false, 
    hideCategoriesOnly: false,        
    emptyShopMessage: "ร้านค้าปิดปรับปรุงชั่วคราว หรือสินค้าหมดเกลี้ยง",
    isEmptyShop: false                
  });

  const [showPopupAlert, setShowPopupAlert] = useState(false);

  const now = new Date();
  const currentMonthName = now.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  const categories = ["Singfiv 20k", "Marbo9000", "Marbo 10k", "Relx go smash 12k","JOIWAY F4 20K 2 รสใน 1 แท่ง", "Relx novo 14k", "Relx Spartar 20k", "Relx Creator 20k","Vplus 16k", "Relx Creator clear 18k", "Infy 20k", "M switch 15k", "Marbo 25k", "Esko bar 20k", "Lambo 12k"];

  useEffect(() => { 
    fetchData(); 
    fetchWebConfig();
    fetchMembersAndCampaigns();
  }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*');
    const { data: s } = await supabase.from('sales_history').select('*');
    setProducts(p || []);
    setSales(s || []);
  }

  async function fetchMembersAndCampaigns() {
    const { data: mData } = await supabase.from('members').select('*');
    const { data: cData } = await supabase.from('campaigns').select('*');
    setMembers(mData || []);
    setCampaigns(cData || []);
  }

  async function fetchWebConfig() {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (data) {
      const mergedConfig = {
        announcement: data.announcement ?? "ยินดีต้อนรับสู่ร้าน Bossystock สินค้าพร้อมส่งเพียบ!",
        showAnnouncement: data.showAnnouncement ?? true,
        showPopupAlert: data.showPopupAlert ?? true,
        showSearchBox: data.showSearchBox ?? true,
        hideProductsAndCategories: data.hideProductsAndCategories ?? false,
        hideCategoriesOnly: data.hideCategoriesOnly ?? false,
        emptyShopMessage: data.emptyShopMessage ?? "ร้านค้าปิดปรับปรุงชั่วคราว หรือสินค้าหมดเกลี้ยง",
        isEmptyShop: data.isEmptyShop ?? false
      };
      setWebConfig(mergedConfig);
      
      const isHidden = sessionStorage.getItem('bossy_hide_popup_session');
      if (mergedConfig.showAnnouncement && mergedConfig.showPopupAlert && !isHidden) {
        setShowPopupAlert(true);
      }
    }
  }

  async function updateWebConfig(newConfig) {
    setWebConfig(newConfig);
    const { error } = await supabase.from('settings').upsert({ id: 1, ...newConfig });
    if (error) {
      console.error("Error saving config:", error.message);
      alert("บันทึกไม่สำเร็จ: " + error.message);
    }
  }

  // ฟังก์ชันเช็คแต้มหน้าบ้าน
  async function handleCheckPoints(e) {
    e.preventDefault();
    if (!checkPhone || !checkTime) {
      alert("กรุณากรอกเบอร์โทรและเวลาที่สั่งซื้อล่าสุดให้ครบถ้วน");
      return;
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', checkPhone)
      .single();

    if (error || !data) {
      alert("ไม่พบข้อมูลสมาชิกจากเบอร์โทรนี้");
      setMemberResult(null);
      return;
    }

    if (data.is_banned) {
      alert(`บัญชีนี้ถูกระงับชั่วคราว เนื่องจาก: ${data.ban_reason || 'ไม่ระบุสาเหตุ'}`);
      setMemberResult(null);
      return;
    }

    setMemberResult(data);
  }

  // ฟังก์ชันเพิ่ม/ลดแต้มจากหลังบ้าน
  async function handleModifyPoints(memberId) {
    const pointsNum = parseInt(pointInput);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      alert("กรุณากรอกจำนวนแต้มให้ถูกต้อง");
      return;
    }
    if (!pointReason.trim()) {
      alert("กรุณาระบุเหตุผลในการเพิ่ม/ลดแต้ม");
      return;
    }

    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    let newPoints = pointActionType === 'add' ? targetMember.points + pointsNum : targetMember.points - pointsNum;
    if (newPoints < 0) newPoints = 0;

    const { error } = await supabase
      .from('members')
      .update({ points: newPoints })
      .eq('id', memberId);

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
      await supabase.from('point_logs').insert({
        phone: targetMember.phone,
        points_changed: pointActionType === 'add' ? pointsNum : -pointsNum,
        reason: pointReason
      });
      alert("อัปเดตแต้มสำเร็จ!");
      setPointInput('');
      setPointReason('');
      setSelectedMemberForAction(null);
      fetchMembersAndCampaigns();
    }
  }

  // ฟังก์ชันแบนสมาชิก
  async function handleBanMember(memberId) {
    if (!banReasonInput.trim()) {
      alert("กรุณาระบุเหตุผลในการแบน");
      return;
    }
    const { error } = await supabase
      .from('members')
      .update({ is_banned: true, ban_reason: banReasonInput })
      .eq('id', memberId);

    if (error) {
      alert("แบนไม่สำเร็จ: " + error.message);
    } else {
      alert("ระงับสมาชิกเรียบร้อยแล้ว");
      setShowBanModal(false);
      setBanReasonInput('');
      setTargetMemberId(null);
      fetchMembersAndCampaigns();
    }
  }

  async function handleUnbanMember(memberId) {
    await supabase.from('members').update({ is_banned: false, ban_reason: null }).eq('id', memberId);
    fetchMembersAndCampaigns();
  }

  async function handleDeleteSale(id) {
    if (password !== '1236') { 
      alert("รหัสผ่านไม่ถูกต้อง!");
      return;
    }
    const { error } = await supabase.from('sales_history').delete().eq('id', id);
    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
    } else {
      alert("ลบรายการสำเร็จ");
      setPassword('');
      setShowDeleteModal(false);
      fetchData(); 
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    await supabase.from('products').insert([newProduct]);
    alert("เพิ่มสินค้าใหม่สำเร็จ!");
    setNewProduct({ name: '', price: 0, cost: 0, stock_quantity: 0, image_url: '', category: '' });
    fetchData();
  }

  async function handleRestock(p) {
    const amount = parseInt(restockAmounts[p.id] || 0);
    if (amount > 0) {
      await supabase.from('products').update({ stock_quantity: Number(p.stock_quantity) + amount }).eq('id', p.id);
      setRestockAmounts({...restockAmounts, [p.id]: ''});
      fetchData();
    }
  }

  async function handleSell(p) {
    if (p.stock_quantity > 0) {
      const qtyInput = prompt(`ระบุจำนวนที่ต้องการขาย (${p.name}):`, "1");
      if (qtyInput === null) return;
      const quantity = parseInt(qtyInput);
      
      if (isNaN(quantity) || quantity <= 0) {
        alert("กรุณากรอกจำนวนให้ถูกต้อง");
        return;
      }

      if (quantity > p.stock_quantity) {
        alert("สินค้าในสต็อกไม่พอขาย!");
        return;
      }

      const defaultTotal = Number(p.price) * quantity;
      const priceInput = prompt(`ระบุราคาขายรวมทั้งหมด (ราคาปกติ ${defaultTotal} บาท):`, defaultTotal);
      if (priceInput === null) return;
      
      const finalPrice = Number(priceInput);
      if (isNaN(finalPrice) || finalPrice < 0) {
        alert("กรุณากรอกราคาให้ถูกต้อง");
        return;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: Number(p.stock_quantity) - quantity })
        .eq('id', p.id);

      if (updateError) {
        alert("เกิดข้อผิดพลาดในการตัดสต็อก: " + updateError.message);
        return;
      }
      
      const { error: insertError } = await supabase.from('sales_history').insert({ 
        product_id: p.id, 
        product_name: p.name, 
        quantity: quantity,
        sale_price: finalPrice, 
        cost_price: Number(p.cost) * quantity, 
        sold_at: new Date().toISOString() 
      });

      if (insertError) {
        alert("เกิดข้อผิดพลาดในการบันทึกยอดขาย: " + insertError.message);
      } else {
        fetchData();
        alert(`บันทึกการขายสำเร็จ! (${quantity} ชิ้น | ยอดรวม: ${finalPrice} บาท)`);
      }
    } else {
      alert("สินค้าหมด!");
    }
  }

  const getAvailableMonths = () => {
    const monthsSet = new Set();
    sales.forEach(s => {
      if (!s.sold_at) return;
      const date = new Date(s.sold_at);
      const monthName = date.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
      monthsSet.add(monthName);
    });
    return Array.from(monthsSet);
  };

  const calculateStats = (range) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let totalSales = 0;
    let totalProfit = 0;
    let totalQty = 0;

    sales.forEach(s => {
      if (!s.sold_at) return;
      const saleDate = new Date(s.sold_at);
      let isMatch = false;

      if (range === 'today') {
        const diffInDays = Math.ceil((startOfToday - saleDate) / (1000 * 60 * 60 * 24));
        isMatch = diffInDays <= 0;
      } else if (range === 'week') {
        const diffInDays = Math.ceil((startOfToday - saleDate) / (1000 * 60 * 60 * 24));
        isMatch = diffInDays >= 0 && diffInDays <= 7;
      } else {
        const saleMonthName = saleDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
        isMatch = saleMonthName === range;
      }

      if (isMatch) {
        const sPrice = Number(s.sale_price) || 0;
        const cPrice = Number(s.cost_price) || 0;
        const qty = Number(s.quantity) || 1; 
        
        totalSales += sPrice;
        totalProfit += (sPrice - cPrice);
        totalQty += qty;
      }
    });
    return { totalSales, totalProfit, totalQty };
  };

  return (
    <div className="p-6 relative">
      {/* ป๊อปอัปประกาศหน้าแรก */}
      {!showAdmin && webConfig.showAnnouncement && webConfig.showPopupAlert && showPopupAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center border-t-4 border-blue-600 relative">
            <button 
              onClick={() => setShowPopupAlert(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 font-bold text-xl px-2"
            >
              &times;
            </button>

            <h3 className="font-bold text-lg mb-2 text-blue-600">📢 ประกาศจากทางร้าน</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">{webConfig.announcement}</p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowPopupAlert(false)} 
                className="bg-blue-600 text-white px-6 py-2 rounded font-bold w-full hover:bg-blue-700 transition"
              >
                ปิดหน้าต่างนี้
              </button>
              <button 
                onClick={() => {
                  sessionStorage.setItem('bossy_hide_popup_session', 'true');
                  setShowPopupAlert(false);
                }} 
                className="text-xs text-gray-500 hover:underline mt-1"
              >
                ไม่ต้องแสดงป๊อปอัปนี้อีกในอุปกรณ์นี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ปุ่มเปิดเช็คแต้มหน้าบ้าน */}
      {!showAdmin && (
        <div className="mb-4 flex justify-end">
          <button 
            onClick={() => setShowPointModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-emerald-700 flex items-center gap-2"
          >
            ⭐ เช็คแต้มสะสมสมาชิก
          </button>
        </div>
      )}

      {/* Modal เช็คแต้มหน้าบ้าน */}
      {showPointModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full relative">
            <button onClick={() => { setShowPointModal(false); setMemberResult(null); }} className="absolute top-3 right-3 text-gray-400 hover:text-black font-bold text-xl">&times;</button>
            <h3 className="font-bold text-lg mb-4 text-emerald-600 text-center">⭐ ตรวจสอบแต้มสะสมสมาชิก</h3>
            
            <form onSubmit={handleCheckPoints} className="space-y-3 mb-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">เบอร์มือถือ:</label>
                <input type="text" placeholder="089xxxxxxx" className="w-full border p-2 rounded" value={checkPhone} onChange={e => setCheckPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">วันที่สั่งซื้อล่าสุด (เช่น YYYY-MM-DD):</label>
                <input type="text" placeholder="ระบุวันที่" className="w-full border p-2 rounded" value={checkTime} onChange={e => setCheckTime(e.target.value)} />
              </div>
              <button className="w-full bg-emerald-600 text-white p-2 rounded font-bold hover:bg-emerald-700">ตรวจสอบข้อมูล</button>
            </form>

            {memberResult && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg space-y-2 text-sm">
                <p><b>ชื่อสมาชิก:</b> {memberResult.name}</p>
                <p><b>เบอร์โทร:</b> {memberResult.phone}</p>
                <p className="text-lg font-bold text-emerald-700">แต้มสะสมปัจจุบัน: {memberResult.points} แต้ม</p>
                
                <div className="mt-3 border-t pt-2">
                  <p className="font-bold text-gray-700 mb-1">🎁 ของรางวัลแคมเปญปัจจุบัน:</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    {campaigns.map(camp => (
                      <li key={camp.id} className={memberResult.points >= camp.target_points ? "text-emerald-600 font-bold" : ""}>
                        ครบ {camp.target_points} แต้ม: {camp.reward_description} {memberResult.points >= camp.target_points ? "✨ (มีสิทธิ์รับรางวัล)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!showAdmin ? (
        <div className="space-y-4">
          {webConfig.showAnnouncement && (
            <div className="bg-blue-100 border border-blue-300 text-blue-800 p-3 rounded-lg flex justify-between items-center shadow-sm">
              <span>📢 <b>ประกาศ:</b> {webConfig.announcement}</span>
              {webConfig.showPopupAlert && (
                <button onClick={() => setShowPopupAlert(true)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">แสดงป๊อปอัป</button>
              )}
            </div>
          )}

          {webConfig.isEmptyShop ? (
            <div className="bg-white p-12 rounded shadow text-center space-y-3">
              <p className="text-2xl font-bold text-gray-400">🛒</p>
              <p className="text-lg font-bold text-gray-600">{webConfig.emptyShopMessage}</p>
            </div>
          ) : (
            <>
              {webConfig.showSearchBox && (
                <div className="bg-white p-3 rounded-lg shadow-sm border flex items-center">
                  <span className="text-gray-400 mr-2">🔍</span>
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อสินค้า หรือ กลิ่น..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full outline-none text-gray-700 bg-transparent"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">ล้าง</button>
                  )}
                </div>
              )}

              {!webConfig.hideCategoriesOnly && !webConfig.hideProductsAndCategories && (
                <div className="flex gap-2 overflow-x-auto p-4 bg-gray-100 rounded">
                  <button 
                    onClick={() => setSelectedCategory('ทั้งหมด')}
                    className={`px-4 py-2 rounded font-bold ${selectedCategory === 'ทั้งหมด' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  >
                    ทั้งหมด
                  </button>
                  {categories
                    .filter(cat => products.some(p => p.category === cat && p.stock_quantity > 0))
                    .map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white'}`}
                      >
                        {cat}
                      </button>
                    ))
                  }
                </div>
              )}

              {webConfig.hideProductsAndCategories ? (
                <div className="bg-amber-50 border border-amber-300 p-8 rounded text-center text-amber-800 font-bold">
                  🔒 รายการสินค้าและหมวดหมู่ถูกปิดซ่อมแซมชั่วคราว
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                  {products
                    .filter(p => {
                      const matchStock = p.stock_quantity > 0;
                      const matchCategory = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
                      const matchSearch = searchQuery.trim() === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
                      return matchStock && matchCategory && matchSearch;
                    })
                    .map(p => (
                      <div key={p.id} className="bg-white p-4 rounded shadow border">
                        <img src={p.image_url} className="w-full h-32 object-cover mb-2 rounded" onError={(e) => e.target.style.display = 'none'} />
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category}</p>
                        <p className="text-blue-600 font-bold">ราคา {p.price} บาท</p>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            {['dashboard', 'stock', 'add', 'members', 'history', 'websetting'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`p-2 rounded font-bold ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                {tab === 'dashboard' ? 'Dashboard' : tab === 'stock' ? 'จัดการสต็อก' : tab === 'add' ? 'เพิ่มสินค้า' : tab === 'members' ? '👥 จัดการสมาชิก' : tab === 'history' ? 'ประวัติการขาย' : '⚙️ จัดการหน้าเว็บ'}
              </button>
            ))}
          </div>

          {activeTab === 'websetting' && (
            <div className="bg-white p-6 shadow rounded space-y-6 max-w-2xl">
              <h2 className="text-xl font-bold border-b pb-2 text-blue-600">🛠️ ตั้งค่าและจัดการหน้าเว็บ (ข้อมูลส่วนกลาง)</h2>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700">1. การจัดการประกาศและกล่องข้อความ</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={webConfig.showAnnouncement} 
                    onChange={e => updateWebConfig({...webConfig, showAnnouncement: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>แสดงข้อความประกาศหน้าเว็บ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pl-6">
                  <input 
                    type="checkbox" 
                    checked={webConfig.showPopupAlert} 
                    onChange={e => updateWebConfig({...webConfig, showPopupAlert: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">เด้งเป็นป๊อปอัปอัตโนมัติเมื่อลูกค้าเข้าเว็บไซต์ครั้งแรก</span>
                </label>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">ข้อความประกาศ:</label>
                  <textarea 
                    className="w-full border p-2 rounded" 
                    rows="3"
                    value={webConfig.announcement}
                    onChange={e => updateWebConfig({...webConfig, announcement: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700">2. ช่องค้นหาชื่อสินค้า / กลิ่น</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={webConfig.showSearchBox} 
                    onChange={e => updateWebConfig({...webConfig, showSearchBox: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>เปิดใช้งานช่องค้นหาหน้าเว็บไซต์</span>
                </label>
              </div>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <span>🔒</span> 3. ซ่อนหรือล็อคหมวดหมู่สินค้าและหน้าเว็บ
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={webConfig.hideProductsAndCategories} 
                      onChange={e => updateWebConfig({...webConfig, hideProductsAndCategories: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-red-600">🔒 ล็อคและซ่อนสินค้าทั้งหมดหน้าเว็บ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={webConfig.hideCategoriesOnly} 
                      onChange={e => updateWebConfig({...webConfig, hideCategoriesOnly: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">🔒 ซ่อนแถบหมวดหมู่สินค้าด้านบนหน้าเว็บ</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700">4. โหมดหน้าสินค้าว่างเปล่า</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={webConfig.isEmptyShop} 
                    onChange={e => updateWebConfig({...webConfig, isEmptyShop: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">เปิดใช้งานหน้าสินค้าว่างเปล่า</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ข้อความที่จะให้แสดงแทนหน้าสินค้า:</label>
                  <input 
                    type="text" 
                    className="w-full border p-2 rounded" 
                    value={webConfig.emptyShopMessage}
                    onChange={e => updateWebConfig({...webConfig, emptyShopMessage: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white p-6 shadow rounded space-y-6">
              <h2 className="text-xl font-bold text-blue-600 border-b pb-2">👥 ระบบจัดการสมาชิก แคมเปญ และแต้ม</h2>
              
              <div className="bg-gray-50 p-4 rounded border space-y-3">
                <h3 className="font-bold text-gray-700">🏆 แคมเปญของรางวัลสะสมแต้ม</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {campaigns.map(c => (
                    <div key={c.id} className="bg-white p-3 rounded border shadow-sm">
                      <p className="font-bold text-blue-600">สะสมครบ {c.target_points} แต้ม</p>
                      <p className="text-sm text-gray-600">{c.reward_description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-gray-700">รายชื่อสมาชิกทั้งหมด</h3>
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white shadow-sm">
                      <div>
                        <p className="font-bold">{m.name} <span className="text-gray-500 font-normal">({m.phone})</span></p>
                        <p className="text-sm text-emerald-600 font-bold">แต้มสะสม: {m.points} แต้ม</p>
                        {m.is_banned && <p className="text-xs text-red-600 font-bold">⚠️ ถูกแบน: {m.ban_reason}</p>}
                      </div>

                      <div className="flex gap-2 items-center flex-wrap">
                        <button onClick={() => setSelectedMemberForAction(selectedMemberForAction === m.id ? null : m.id)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                          {selectedMemberForAction === m.id ? 'ปิด' : 'จัดการแต้ม'}
                        </button>
                        {m.is_banned ? (
                          <button onClick={() => handleUnbanMember(m.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">ปลดแบน</button>
                        ) : (
                          <button onClick={() => { setTargetMemberId(m.id); setShowBanModal(true); }} className="bg-red-600 text-white px-3 py-1 rounded text-sm">แบนสมาชิก</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedMemberForAction && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-3">
                  <h4 className="font-bold text-blue-800">จัดการแต้มให้สมาชิก</h4>
                  <div className="flex gap-2">
                    <select className="border p-2 rounded" value={pointActionType} onChange={e => setPointActionType(e.target.value)}>
                      <option value="add">เพิ่มแต้ม (+)</option>
                      <option value="sub">ลดแต้ม (-)</option>
                    </select>
                    <input type="number" placeholder="จำนวนแต้ม" className="border p-2 rounded w-32" value={pointInput} onChange={e => setPointInput(e.target.value)} />
                  </div>
                  <input type="text" placeholder="ระบุเหตุผลในการเพิ่ม/ลดแต้ม..." className="w-full border p-2 rounded" value={pointReason} onChange={e => setPointReason(e.target.value)} />
                  <button onClick={() => handleModifyPoints(selectedMemberForAction)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">ยืนยันการบันทึกแต้ม</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['today', 'week', currentMonthName].map(d => {
                  const { totalSales, totalProfit, totalQty } = calculateStats(d);
                  return (
                    <div key={d} className="bg-white p-4 shadow rounded border">
                      <h3 className="font-bold text-gray-700">
                        ยอด {d === 'today' ? "วันนี้" : d === 'week' ? "สัปดาห์นี้" : `เดือน${d}`}
                      </h3>
                      <p className="text-xl font-bold mt-1">ยอดขาย: {totalSales.toLocaleString()} บ.</p>
                      <p className="text-sm font-bold text-blue-600">ขายได้: {totalQty} ชิ้น</p>
                      <p className="text-lg font-bold text-green-600">กำไร: {totalProfit.toLocaleString()} บ.</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              {categories.map((category) => {
                const productsInCategory = products.filter(p => p.category === category);
                if (productsInCategory.length === 0) return null;
                return (
                  <div key={category} className="bg-white p-4 shadow rounded">
                    <h3 className="font-bold text-lg mb-3 border-b pb-2 text-blue-600">{category}</h3>
                    {productsInCategory.map(p => (
                      <div key={p.id} className="flex justify-between border-b p-3 items-center hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-sm text-gray-500">คงเหลือ: {p.stock_quantity}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input type="number" placeholder="เติม" className="w-16 border p-1 rounded text-center" 
                            value={restockAmounts[p.id] || ''} onChange={(e) => setRestockAmounts({...restockAmounts, [p.id]: e.target.value})} />
                          <button onClick={() => handleRestock(p)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">เติม</button>
                          <button onClick={() => handleSell(p)} className="bg-orange-500 text-white px-3 py-1 rounded text-sm">ขาย</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleAddProduct} className="bg-white p-6 shadow space-y-3 max-w-xl">
              <input placeholder="ชื่อสินค้า" className="w-full border p-2" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <select className="w-full border p-2" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="ราคาขาย" type="number" className="w-full border p-2" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <input placeholder="ต้นทุน" type="number" className="w-full border p-2" value={newProduct.cost || ''} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} />
              <input placeholder="สต็อก" type="number" className="w-full border p-2" value={newProduct.stock_quantity || ''} onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})} />
              <input placeholder="URL รูป" className="w-full border p-2" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} />
              <button className="bg-blue-600 text-white p-2 w-full">บันทึกสินค้าใหม่</button>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="bg-white p-4 shadow rounded space-y-4">
              <h3 className="font-bold text-lg">ประวัติการขายล่าสุด</h3>
              {sales.sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at)).map(s => (
                <div key={s.id} className="border-b pb-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold">{s.product_name} <span className="text-blue-600 font-normal">({s.quantity || 1} ชิ้น)</span></p>
                    <p className="text-gray-500">ขาย {s.sale_price} บ. | กำไร {s.sale_price - s.cost_price} บ.</p>
                  </div>
                  <button onClick={() => { setTargetDeleteId(s.id); setShowDeleteModal(true); }} className="bg-red-500 text-white px-3 py-1 rounded text-xs">ลบ</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-sm">
            <h3 className="mb-4 font-bold">ยืนยันการลบ (รหัส 4 หลัก)</h3>
            <input type="password" maxLength="4" className="border w-full p-2 mb-4 text-center text-xl" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <button className="flex-1 bg-gray-300 p-2 rounded" onClick={() => setShowDeleteModal(false)}>ยกเลิก</button>
              <button className="flex-1 bg-red-600 text-white p-2 rounded" onClick={() => handleDeleteSale(targetDeleteId)}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-sm space-y-3">
            <h3 className="font-bold text-red-600">ระบุเหตุผลการแบนสมาชิก</h3>
            <textarea className="border w-full p-2 rounded" rows="3" placeholder="ระบุสาเหตุ..." value={banReasonInput} onChange={e => setBanReasonInput(e.target.value)} />
            <div className="flex gap-2">
              <button className="flex-1 bg-gray-300 p-2 rounded" onClick={() => setShowBanModal(false)}>ยกเลิก</button>
              <button className="flex-1 bg-red-600 text-white p-2 rounded" onClick={() => handleBanMember(targetMemberId)}>ยืนยันแบน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}