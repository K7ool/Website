"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { orderBy } from "firebase/firestore";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import { productService, storageService } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  "Scripts", "Models", "UI Systems", "Admin Systems",
  "Vehicles", "Building Systems", "Donation Systems", "Custom Orders",
];

const initialForm = {
  name: "", slug: "", shortDescription: "", description: "",
  category: "", price: 0, salePrice: 0, thumbnail: "",
  gallery: [] as string[], downloadFile: "", downloadFileName: "", downloadFileSize: 0, version: "1.0.0",
  tags: "", featured: false, status: "draft", bindingType: "any",
};

export default function AdminProductsPage() {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...initialForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const thumbnailRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = productService.subscribe((items) => {
      setProducts(items);
      setLoading(false);
    }, [orderBy("createdAt", "desc")]);
    return unsub;
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: products.length,
    published: products.filter((p) => p.status === "published").length,
    draft: products.filter((p) => p.status === "draft").length,
    sales: products.reduce((s, p) => s + (p.sales || 0), 0),
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...initialForm });
    setUploadError(null);
    setShowModal(true);
  };

  const openEdit = (product: any) => {
    setEditing(product);
    setUploadError(null);
    setForm({
      name: product.name || "",
      slug: product.slug || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      category: product.category || "",
      price: product.price || 0,
      salePrice: product.salePrice || 0,
      thumbnail: product.thumbnail || "",
      gallery: product.gallery || [],
      downloadFile: product.downloadFile || "",
      downloadFileName: product.downloadFileName || "",
      downloadFileSize: product.downloadFileSize || 0,
      version: product.version || "1.0.0",
      tags: product.tags || "",
      featured: product.featured || false,
      status: product.status || "draft",
      bindingType: product.bindingType || "any",
    });
    setShowModal(true);
  };

  const getProductId = () => editing?.id || `new-${Date.now()}`;

  const handleUpload = async (file: File, path: string): Promise<string> => {
    setUploading(path);
    setUploadError(null);
    try {
      const url = await storageService.uploadFile(path, file, "products", user?.uid);
      setUploading(null);
      return url;
    } catch (err: any) {
      setUploading(null);
      setUploadError(err?.message || "Upload failed.");
      throw err;
    }
  };

  const handleThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const productId = getProductId();
    try {
      const url = await storageService.uploadProductThumbnail(productId, file, user?.uid);
      setForm((f) => ({ ...f, thumbnail: url }));
    } catch {
      // error already set by handleUpload via uploadProductThumbnail
    }
  };

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const productId = getProductId();
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const url = await storageService.uploadProductGallery(productId, file, user?.uid);
        urls.push(url);
      } catch {
        // error already set by handleUpload
        break;
      }
    }
    setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls] }));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const productId = getProductId();
    try {
      const url = await storageService.uploadProductDownload(productId, file, user?.uid);
      setForm((f) => ({ ...f, downloadFile: url, downloadFileName: file.name, downloadFileSize: file.size }));
    } catch {
      // error already set by handleUpload
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) return;
    if (!isAdmin) { setUploadError("Admin access required to create or edit products."); return; }
    setSubmitting(true);
    setUploadError(null);
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const tags = Array.isArray(form.tags)
        ? form.tags
        : String(form.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
      const data = {
        ...form,
        slug,
        tags,
        price: Number(form.price),
        salePrice: form.salePrice ? Number(form.salePrice) : 0,
        image: form.thumbnail,
        images: form.gallery,
      };
      if (editing) {
        await productService.update(editing.id, data);
      } else {
        await productService.create(data);
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: any) {
      console.error("Save failed:", err);
      setUploadError(err?.message || "Failed to save product.");
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productService.delete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeleting(false);
  };

  const toggleFeatured = async (product: any) => {
    await productService.update(product.id, { featured: !product.featured });
  };

  const removeGalleryImage = (index: number) => {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Products</h2>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all"
        >
          + Add Product
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Total Products</div>
        </GlassCard>
        <GlassCard>
          <div className="text-2xl font-bold text-green-400">{stats.published}</div>
          <div className="text-xs text-gray-400">Published</div>
        </GlassCard>
        <GlassCard>
          <div className="text-2xl font-bold text-yellow-400">{stats.draft}</div>
          <div className="text-xs text-gray-400">Drafts</div>
        </GlassCard>
        <GlassCard>
          <div className="text-2xl font-bold text-blue-400">{stats.sales}</div>
          <div className="text-xs text-gray-400">Total Sales</div>
        </GlassCard>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, or ID..."
          className="w-full max-w-md px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {filtered.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-gray-400 text-center py-10">
            {search ? "No products match your search." : "No products yet. Click Add Product to create one."}
          </p>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/10">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Product</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Category</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Price</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Sales</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-purple-500/5 hover:bg-white/5">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center shrink-0 overflow-hidden">
                          {product.thumbnail ? (
                            <img src={product.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-purple-400">
                              {product.name?.charAt(0) || "?"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate max-w-[200px]">
                            {product.name || "Untitled"}
                          </div>
                          {product.featured && (
                            <span className="text-[10px] text-purple-400">Featured</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-400">{product.category || "—"}</td>
                    <td className="py-3 px-3">
                      <span className="text-white">${(product.price || 0).toFixed(2)}</span>
                      {product.salePrice ? (
                        <span className="text-xs text-gray-500 line-through ml-1">
                          ${(product.salePrice).toFixed(2)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        product.status === "published" ? "bg-green-500/10 text-green-400" :
                        product.status === "draft" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>{product.status || "draft"}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-400">{product.sales || 0}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs">
                      {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-all"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openEdit(product)}
                          className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleFeatured(product)}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            product.featured
                              ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                              : "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"
                          }`}
                        >
                          {product.featured ? "★" : "☆"}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setEditing(null); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass rounded-2xl p-6 w-full max-w-2xl my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editing ? "Edit Product" : "Add Product"}
                </h3>
                <button
                  onClick={() => { setShowModal(false); setEditing(null); }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-4">
                  {uploadError}
                </div>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Product Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Advanced Admin System"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Slug</label>
                    <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="Auto-generated if empty"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Short Description</label>
                  <textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    rows={2} placeholder="Brief product summary"
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Full Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4} placeholder="Detailed product description, features, installation..."
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Category *</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                      <option value="">Select category</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Version</label>
                    <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                      placeholder="1.0.0"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Price ($) *</label>
                    <input type="number" step="0.01" min="0" value={form.price || ""}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                      placeholder="24.99"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Sale Price (optional)</label>
                    <input type="number" step="0.01" min="0" value={form.salePrice || ""}
                      onChange={(e) => setForm({ ...form, salePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="19.99"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Tags (comma separated)</label>
                  <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="admin, moderation, tools"
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Thumbnail Image</label>
                  <input ref={thumbnailRef} type="file" accept="image/*" onChange={handleThumbnail}
                    className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600/20 file:text-purple-400 hover:file:bg-purple-600/30 file:cursor-pointer" />
                  {uploading?.includes("thumbnails/") && (
                    <p className="text-xs text-purple-400 mt-1">Uploading thumbnail...</p>
                  )}
                  {form.thumbnail && (
                    <div className="mt-2 relative inline-block">
                      <img src={form.thumbnail} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      <button onClick={() => setForm({ ...form, thumbnail: "" })}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Gallery Images</label>
                  <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleGallery}
                    className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600/20 file:text-purple-400 hover:file:bg-purple-600/30 file:cursor-pointer" />
                  {uploading?.includes("gallery/") && (
                    <p className="text-xs text-purple-400 mt-1">Uploading gallery image...</p>
                  )}
                  {form.gallery.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.gallery.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                          <button onClick={() => removeGalleryImage(i)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Download File (.rbxm, .rbxl, .zip, .rar)</label>
                  <input ref={fileRef} type="file" accept=".rbxm,.rbxl,.zip,.rar" onChange={handleFile}
                    className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600/20 file:text-purple-400 hover:file:bg-purple-600/30 file:cursor-pointer" />
                  {uploading?.includes("downloads/") && (
                    <p className="text-xs text-purple-400 mt-1">Uploading file...</p>
                  )}
                  {form.downloadFile && (
                    <p className="text-xs text-green-400 mt-1">File uploaded ✓</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Binding Type</label>
                  <p className="text-[10px] text-gray-500 mb-1.5">Controls what the license binds to on first activation</p>
                  <select value={form.bindingType} onChange={(e) => setForm({ ...form, bindingType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                    <option value="any">Any (bind to game)</option>
                    <option value="universe">Game (universeId)</option>
                    <option value="creator">Creator (creatorId)</option>
                    <option value="user">User (robloxUserId)</option>
                  </select>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="w-4 h-4 rounded border-purple-500/20 bg-dark-700 text-purple-600 focus:ring-purple-500" />
                    <span className="text-sm text-gray-300">Featured Product</span>
                  </label>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-500/10">
                <button
                  onClick={() => { setShowModal(false); setEditing(null); }}
                  className="px-5 py-2.5 rounded-lg bg-dark-600 text-gray-300 text-sm font-medium hover:bg-dark-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.name.trim() || !form.category}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all"
                >
                  {submitting ? "Saving..." : editing ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Product</h3>
              <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to delete <span className="text-white font-medium">{deleteTarget.name}</span>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50 transition-all">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
