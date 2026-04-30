"use client";

import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import { ChangeEvent, useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import type { ProfileFormData } from "@/lib/types";

type EditableMap = {
  username: boolean;
  name: boolean;
  surname: boolean;
  phoneNumber: boolean;
  bio: boolean;
  description: boolean;
};

type EditableFieldProps = {
  label: string;
  name: keyof ProfileFormData;
  value: string;
  editable: boolean;
  onEdit: () => void;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
};

export default function ProfileSettings() {
  const { userData, setUserData } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] =
    useState<ProfileFormData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [formData, setFormData] =
    useState<ProfileFormData | null>(null);
  const [editable, setEditable] = useState<EditableMap>({
    username: false,
    name: false,
    surname: false,
    phoneNumber: false,
    bio: false,
    description: false,
  });

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    if (userData) {
      const data = {
        username: userData.username || "",
        name: userData.name || "",
        surname: userData.surname || "",
        phoneNumber: userData.phoneNumber || "",
        bio: userData.bio || "",
        description: userData.description || "",
      };
      setFormData(data);
      setInitialData(data);
      setAvatar(userData.avatar || null);
    }
  }, [userData]);

  const isFormChanged = JSON.stringify(formData) !== JSON.stringify(initialData);

  if (!formData) {
    return null;
  }

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) return;

    const data = new FormData();
    data.append("avatar", selectedFile);

    try {
      setUploadingAvatar(true);
      const res = await axios.post(BACKEND_URL + "/api/users/avatar", data, { withCredentials: true });
      if (res.data.success) {
        setAvatar(res.data.avatar);
        setUserData(prev => prev ? { ...prev, avatar: res.data.avatar } : prev);
        setSelectedFile(null);
        setPreview(null);
        toast.success("Profile picture updated");
      }
    } catch {
      toast.error("Failed to update profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleEdit = (field: keyof EditableMap) => {
    setEditable(prev => ({ ...prev, [field]: true }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data } = await axios.put(BACKEND_URL + "/api/users/update-profile", formData, { withCredentials: true });
      if (data.success) {
        setUserData(data.user);
        setInitialData(formData);
        toast.success(data.message)
        setEditable({
          username: false,
          name: false,
          surname: false,
          phoneNumber: false,
          bio: false,
          description: false,
        });
      } else {
        toast.warn(data.message)
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarDiscard = () => {
    setSelectedFile(null);
    setPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    setFormData(initialData);
    handleAvatarDiscard();
    setEditable({
      username: false,
      name: false,
      surname: false,
      phoneNumber: false,
      bio: false,
      description: false,
    });
  };

  return (
    <div className="h-screen px-5 md:px-20 py-5 md:pt-5 overflow-y-auto">
      <h1 className="text-xl md:text-2xl mb-3 font-semibold text-white text-center md:text-left">Edit Profile</h1>

      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 mb-6">
        <div className="h-22 md:h-24 w-22 md:w-24 rounded-full overflow-hidden border">
          <img alt="Profile preview" src={preview || avatar || "/avatar-placeholder.png"} className="h-full w-full object-cover" />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 font-medium cursor-pointer"
          >
            Change photo
          </button>

          {selectedFile && (
            <>
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={handleAvatarUpload}
                className="h-9 px-5 text-sm rounded-md bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              >
                {uploadingAvatar ? "Uploading..." : "Set as profile pic"}
              </button>

              <button
                type="button"
                onClick={handleAvatarDiscard}
                className="h-9 px-5 rounded-md bg-white text-sm cursor-pointer"
              >
                Discard
              </button>
            </>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-white">
        <EditableInput
          label="Username"
          name="username"
          value={formData.username}
          editable={editable.username}
          onEdit={() => toggleEdit("username")}
          onChange={handleChange}
        />

        <EditableInput
          label="First name"
          name="name"
          value={formData.name}
          editable={editable.name}
          onEdit={() => toggleEdit("name")}
          onChange={handleChange}
        />

        <EditableInput
          label="Last name"
          name="surname"
          value={formData.surname}
          editable={editable.surname}
          onEdit={() => toggleEdit("surname")}
          onChange={handleChange}
        />

        <EditableInput
          label="Phone number"
          name="phoneNumber"
          value={formData.phoneNumber}
          editable={editable.phoneNumber}
          onEdit={() => toggleEdit("phoneNumber")}
          onChange={handleChange}
        />

        <EditableTextarea
          label="Bio"
          name="bio"
          value={formData.bio}
          editable={editable.bio}
          onEdit={() => toggleEdit("bio")}
          onChange={handleChange}
        />

        <EditableTextarea
          label="Description"
          name="description"
          value={formData.description}
          editable={editable.description}
          onEdit={() => toggleEdit("description")}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end gap-4 mt-7">
        <button className="w-40 py-2 bg-blue-600 text-white cursor-pointer rounded-lg" onClick={handleCancel}>Cancel</button>
        <button disabled={loading || !isFormChanged} onClick={handleSave} className={`w-40 py-2 text-white rounded-lg ${isFormChanged ? 'bg-blue-600 cursor-pointer' : 'cursor-not-allowed bg-blue-400'} ${loading ? 'cursor-not-allowed bg-blue-400' : ''}`}>
          {loading ? 'Saving..' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}


function EditableInput({
  label,
  name,
  value,
  editable,
  onEdit,
  onChange,
}: EditableFieldProps) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="font-medium text-shadow-lg">{label}</label>
        {!editable && (
          <button onClick={onEdit} className="text-white text-shadow-lg text-sm cursor-pointer">
            Edit
          </button>
        )}
      </div>
      <input
        name={name}
        value={value}
        disabled={!editable}
        onChange={onChange}
        className={`w-full px-3 py-2 rounded-lg text-white/80 ${editable ? "border-blue-500 outline-2 outline-white bg-black/10" : "bg-black/15 backdrop-blur-3xl cursor-not-allowed"
          }`}
      />
    </div>
  );
}

function EditableTextarea({
  label,
  name,
  value,
  editable,
  onEdit,
  onChange,
}: EditableFieldProps) {
  return (
    <div className="md:col-span-2">
      <div className="flex justify-between mb-1">
        <label className="font-medium text-shadow-lg">{label}</label>
        {!editable && (
          <button onClick={onEdit} className="text-blue-600 text-sm cursor-pointer">
            Edit
          </button>
        )}
      </div>
      <textarea
        name={name}
        value={value}
        disabled={!editable}
        onChange={onChange}
        rows={3}
        className={`w-full px-3 py-2 rounded-lg text-white/80 ${editable ? "border-blue-500 outline-2 outline-white bg-black/10" : "bg-black/15 backdrop-blur-3xl cursor-not-allowed"
          }`}
      />
    </div>
  );
}
