import { useCallback, useEffect, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../supabase";
import { SharedFile } from "../types";

export function useFiles(householdId: string | null | undefined) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!householdId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("shared_files")
      .select("*")
      .eq("household_id", householdId)
      .order("uploaded_at", { ascending: false });
    setFiles(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`shared_files:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shared_files",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          setFiles((prev) => [payload.new as SharedFile, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "shared_files",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          setFiles((prev) =>
            prev.filter((f) => f.id !== (payload.old as SharedFile).id),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  const uploadFile = async () => {
    if (!householdId) return;

    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${householdId}/${Date.now()}-${safeName}`;

    const response = await fetch(asset.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("shared-files")
      .upload(storagePath, arrayBuffer, {
        contentType: asset.mimeType ?? "application/octet-stream",
      });

    if (uploadError) throw uploadError;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("shared_files").insert({
      household_id: householdId,
      name: asset.name,
      storage_path: storagePath,
      uploaded_by: user?.id ?? null,
    });
  };

  const getFileUrl = async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("shared-files")
      .createSignedUrl(storagePath, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  };

  const deleteFile = async (id: string, storagePath: string) => {
    await supabase.storage.from("shared-files").remove([storagePath]);
    await supabase.from("shared_files").delete().eq("id", id);
  };

  return { files, loading, uploadFile, getFileUrl, deleteFile, fetchFiles };
}
