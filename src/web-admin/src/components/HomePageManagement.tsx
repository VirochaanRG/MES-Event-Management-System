import { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, Trash2, Eye, X } from "lucide-react";

interface ImageData {
  id: number;
  component: string;
  index: number | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
}

const COMPONENTS = [
  { value: "image-carousel", label: "Image Carousel" },
  // Add more components here as needed
  // { value: "hero-banner", label: "Hero Banner" },
  // { value: "gallery", label: "Photo Gallery" },
];

export default function HomePageManagement() {
  const [selectedComponent, setSelectedComponent] = useState(
    COMPONENTS[0].value,
  );
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");

  // Fetch images for selected component
  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/images/${selectedComponent}`);
      const data = await response.json();

      if (data.success) {
        setImages(data.data);
      } else {
        console.error("Failed to fetch images:", data.error);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [selectedComponent]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("component", selectedComponent);

    // Auto-increment index based on existing images
    const maxIndex =
      images.length > 0
        ? Math.max(...images.map((img) => img.index ?? -1))
        : -1;
    formData.append("index", String(maxIndex + 1));

    try {
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Refresh images list
        await fetchImages();
        // Reset file input
        e.target.value = "";
      } else {
        alert("Failed to upload image: " + data.error);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (id: number) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      const response = await fetch(`/api/images/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchImages();
      } else {
        alert("Failed to delete image: " + data.error);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image");
    }
  };

  // Handle image preview
  const handlePreviewImage = async (id: number, fileName: string | null) => {
    try {
      const response = await fetch(`/api/images/${id}/view`);
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setPreviewImage(imageUrl);
      setPreviewFileName(fileName || "Image");
    } catch (error) {
      console.error("Error loading image preview:", error);
      alert("Failed to load image preview");
    }
  };

  const closePreview = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    setPreviewFileName("");
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Component Images
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload and manage images for homepage components
          </p>
        </div>

        {/* Component Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Component:
          </label>
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            {COMPONENTS.map((component) => (
              <option key={component.value} value={component.value}>
                {component.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors inline-block"
            >
              <span>{uploading ? "Uploading..." : "Upload Image"}</span>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 5MB</p>
        </div>
      </div>

      {/* Images Grid */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Existing Images ({images.length})
        </h4>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="text-gray-600 mt-2">No images uploaded yet</p>
            <p className="text-sm text-gray-500">
              Upload your first image to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {image.fileName || `Image ${image.id}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Index: {image.index ?? "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <p>Size: {formatFileSize(image.fileSize)}</p>
                    <p>Type: {image.mimeType || "Unknown"}</p>
                    <p>
                      Uploaded: {new Date(image.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handlePreviewImage(image.id, image.fileName)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closePreview}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {previewFileName}
              </h3>
              <button
                onClick={closePreview}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewImage}
                alt={previewFileName}
                className="max-w-full max-h-[70vh] mx-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
