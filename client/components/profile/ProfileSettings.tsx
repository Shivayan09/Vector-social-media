"use client";

import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import axios from "axios";
import { ChangeEvent, useEffect, useRef, useState } from "react";
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [initialData, setInitialData] =
    useState<ProfileFormData | null>(null);

  const [formData, setFormData] =
    useState<ProfileFormData | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [avatar, setAvatar] =
    useState<string | null>(null);

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
        isPrivate: userData.isPrivate || false,
      };

      setFormData(data);
      setInitialData(data);
      setAvatar(userData.avatar || null);
    }
  }, [userData]);

  const isFormChanged =
    JSON.stringify(formData) !== JSON.stringify(initialData);

  if (!formData) {
    return null;
  }

  const handleAvatarChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
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

      const res = await axios.post(
        `${BACKEND_URL}/api/users/avatar`,
        data,
        { withCredentials: true }
      );

      if (res.data.success) {
        setAvatar(res.data.avatar);

        setUserData((prev) =>
          prev
            ? {
                ...prev,
                avatar: res.data.avatar,
              }
            : prev
        );

        setSelectedFile(null);
        setPreview(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        toast.success("Profile picture updated");
      }
    } catch {
      toast.error("Failed to update profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleEdit = (field: keyof EditableMap) => {
    setEditable((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const resetEditable = () => {
    setEditable({
      username: false,
      name: false,
      surname: false,
      phoneNumber: false,
      bio: false,
      description: false,
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { data } = await axios.put(
        `${BACKEND_URL}/api/users/update-profile`,
        formData,
        { withCredentials: true }
      );

      if (data.success) {
        setUserData(data.user);
        setInitialData(formData);

        toast.success(data.message);

        resetEditable();
      } else {
        toast.warn(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
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
    resetEditable();
  };

  return (
    <div className="page-scroll px-4 py-5 sm:px-7 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-center text-2xl font-bold tracking-tight text-foreground sm:text-left md:text-3xl">
          Edit Profile
        </h1>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/40 backdrop-blur-sm">
          {/* Subtle banner */}
          <div className="h-24 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-500/10 sm:h-28" />

          <div className="px-5 pb-6 sm:px-7 md:px-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
              <div className="relative -mt-12 sm:-mt-14">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-background shadow-lg md:h-28 md:w-28">
                  <img
                    alt="Profile preview"
                    src={
                      preview ||
                      avatar ||
                      "/avatar-placeholder.png"
                    }
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="cursor-pointer text-sm font-semibold text-primary transition hover:opacity-80"
                >
                  Change photo
                </button>

                {selectedFile && (
                  <>
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={handleAvatarUpload}
                      className="h-10 cursor-pointer rounded-xl bg-blue-500 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {uploadingAvatar
                        ? "Uploading..."
                        : "Set as profile pic"}
                    </button>

                    <button
                      type="button"
                      onClick={handleAvatarDiscard}
                      className="h-10 cursor-pointer rounded-xl border border-border bg-background/60 px-5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent hover:shadow-sm active:scale-[0.98]"
                    >
                      Discard
                    </button>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Form Fields */}
            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 text-foreground md:grid-cols-2">
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

              {/* Private Account */}
              <div className="md:col-span-2">
                <div
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/50 bg-background/30 p-4 transition-colors duration-200 hover:bg-accent/30"
                  onClick={() =>
                    setFormData((prev) =>
                      prev
                        ? {
                            ...prev,
                            isPrivate: !prev.isPrivate,
                          }
                        : prev
                    )
                  }
                >
                  <input
                    type="checkbox"
                    checked={formData.isPrivate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isPrivate: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  <div className="flex flex-col">
                    <p className="font-medium text-foreground">
                      Private Account
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Only your followers will see your posts and
                      lists.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                onClick={handleCancel}
                className="w-40 cursor-pointer rounded-xl border border-border bg-background/60 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent hover:shadow-sm active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                disabled={loading || !isFormChanged}
                onClick={handleSave}
                className={`w-40 rounded-xl py-2.5 text-sm font-medium text-white transition-all duration-200 active:scale-[0.98] ${
                  loading || !isFormChanged
                    ? "cursor-not-allowed bg-blue-400"
                    : "cursor-pointer bg-blue-600 hover:bg-blue-700 hover:shadow-sm"
                }`}
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
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
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>

        {!editable && (
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer text-sm font-medium text-primary transition hover:opacity-80"
          >
            Edit
          </button>
        )}
      </div>

      <input
        name={name}
        value={value}
        disabled={!editable}
        onChange={onChange}
        className={`settings-field ${
          editable
            ? "settings-field-editable"
            : "settings-field-disabled"
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
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>

        {!editable && (
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer text-sm font-medium text-primary transition hover:opacity-80"
          >
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
        className={`settings-field resize-none ${
          editable
            ? "settings-field-editable"
            : "settings-field-disabled"
        }`}
      />
    </div>
  );
}