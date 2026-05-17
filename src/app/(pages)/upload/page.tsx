"use client";

import { logger } from "@/lib/logger";
import { MAX_UPLOAD_RECIPE_GROUPS } from "@/schemas/uploadGroupSchema";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import recipeStyles from "../recipes/recipe.module.css";
import styles from "./page.module.css";
import {
  buildUploadFormData,
  createClientId,
  createInitialUploadGroups,
  getFilledUploadGroups,
  getOversizedUploadFiles,
  getTotalImageCount,
  type UploadGroupImage,
  type UploadGroupSelection,
} from "./upload-form";
import {
  getUploadSuccessMessage,
  type UploadApiResponse,
} from "./upload-response";

function revokePreviewUrls(images: UploadGroupImage[]) {
  images.forEach((image) => {
    URL.revokeObjectURL(image.previewUrl);
  });
}

export default function ParsePage() {
  const [groups, setGroups] = useState<UploadGroupSelection[]>(
    createInitialUploadGroups,
  );
  const [error, setError] = useState<string | null>(null);
  const [uploadedToS3, setUploadedToS3] = useState(false);
  const [s3UploadSuccess, setS3UploadSuccess] = useState<string | null>(null);
  const uploadGroupInputIdPrefix = useId();
  const groupsRef = useRef(groups);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    return () => {
      groupsRef.current.forEach((group) => {
        revokePreviewUrls(group.images);
      });
    };
  }, []);

  const filledGroups = getFilledUploadGroups(groups);
  const totalImageCount = getTotalImageCount(filledGroups);

  function resetGroups() {
    groupsRef.current.forEach((group) => {
      revokePreviewUrls(group.images);
    });

    setGroups(createInitialUploadGroups());
  }

  function appendFilesToGroup(groupId: string, selectedFiles: File[]) {
    if (selectedFiles.length === 0) {
      return;
    }

    const oversizedFiles = getOversizedUploadFiles(selectedFiles);

    if (oversizedFiles.length > 0) {
      setError(
        `The following image${oversizedFiles.length > 1 ? "s are" : " is"} too large (max 1024 KB):\n` +
          oversizedFiles.map((file) => `- ${file.name}`).join("\n"),
      );
      setTimeout(() => setError(null), 5000);
      return;
    }

    const nextImages = selectedFiles.map((file) => ({
      id: createClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId
          ? { ...group, images: [...group.images, ...nextImages] }
          : group,
      ),
    );
    setS3UploadSuccess(null);
  }

  function removeImage(groupId: string, imageId: string) {
    setGroups((currentGroups) =>
      currentGroups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        const imageToRemove = group.images.find(
          (image) => image.id === imageId,
        );

        if (imageToRemove) {
          URL.revokeObjectURL(imageToRemove.previewUrl);
        }

        return {
          ...group,
          images: group.images.filter((image) => image.id !== imageId),
        };
      }),
    );
  }

  function removeGroup(groupId: string) {
    if (groups.length === 1) {
      resetGroups();
      return;
    }

    setGroups((currentGroups) => {
      const groupToRemove = currentGroups.find((group) => group.id === groupId);

      if (groupToRemove) {
        revokePreviewUrls(groupToRemove.images);
      }

      return currentGroups.filter((group) => group.id !== groupId);
    });
  }

  function addGroup() {
    if (groups.length >= MAX_UPLOAD_RECIPE_GROUPS) {
      return;
    }

    setGroups((currentGroups) => [
      ...currentGroups,
      ...createInitialUploadGroups(),
    ]);
  }

  async function uploadToS3() {
    setError(null);
    setS3UploadSuccess(null);

    if (filledGroups.length === 0) {
      setError("Add at least one recipe photo group first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploadedToS3(true);

    try {
      const uploadRequest = buildUploadFormData(groups);

      logger.debug("Uploading recipe images to S3", {
        groupCount: uploadRequest.groupCount,
        imageCount: uploadRequest.imageCount,
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadRequest.formData,
      });
      const data = (await response.json()) as UploadApiResponse;

      logger.debug("S3 upload response received", {
        status: response.status,
        groupCount: uploadRequest.groupCount,
        imageCount: uploadRequest.imageCount,
      });

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      setS3UploadSuccess(
        `${getUploadSuccessMessage(data)}. Use Batch Process to extract recipes when ready.`,
      );
      resetGroups();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Unknown error",
      );
    } finally {
      setTimeout(() => {
        setUploadedToS3(false);
        setS3UploadSuccess(null);
      }, 5000);
    }
  }

  return (
    <main className={recipeStyles.main}>
      {s3UploadSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <div className={styles.popupIcon}>✓</div>
            <h2 className={styles.popupTitle}>Upload complete</h2>
            <p className={styles.popupMessage}>
              Your recipe photo groups are stored in S3 and ready for batch
              extraction.
            </p>
            <p className={styles.popupUrl}>{s3UploadSuccess}</p>
          </div>
        </div>
      )}

      <div className={recipeStyles.headerContainer}>
        <div className={styles.pageIntro}>
          <p className={styles.eyebrow}>Recipe Intake</p>
          <h1 className={recipeStyles.pageTitle}>Uploader</h1>
          <p className={recipeStyles.pageSubtitle}>
            Queue up to {MAX_UPLOAD_RECIPE_GROUPS} recipe groups in one upload.
            Each group can contain one or more photos that will stay together
            for batch extraction.
          </p>
        </div>
      </div>

      <form className={recipeStyles.form}>
        <div className={styles.summaryStrip}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Recipe groups</span>
            <strong className={styles.summaryValue}>
              {filledGroups.length}/{MAX_UPLOAD_RECIPE_GROUPS}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Images queued</span>
            <strong className={styles.summaryValue}>{totalImageCount}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Batch-ready grouping</span>
            <strong className={styles.summaryValue}>One recipe per card</strong>
          </div>
        </div>

        <div className={styles.groupList}>
          {groups.map((group, groupIndex) => {
            const inputId = `${uploadGroupInputIdPrefix}-upload-group-${groupIndex}`;

            return (
              <section key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div>
                    <p className={styles.groupEyebrow}>Recipe Group</p>
                    <h2 className={styles.groupTitle}>
                      Recipe {groupIndex + 1}
                    </h2>
                    <p className={styles.groupMeta}>
                      {group.images.length} image
                      {group.images.length === 1 ? "" : "s"} selected
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    className={styles.secondaryAction}
                    disabled={uploadedToS3}
                  >
                    {groups.length === 1 ? "Clear" : "Remove Group"}
                  </button>
                </div>

                <label htmlFor={inputId} className={styles.fileInputLabel}>
                  <span className={styles.fileInputLabelText}>
                    Add Recipe Photos
                  </span>
                  <div className={styles.fileInputDropZone}>
                    <input
                      id={inputId}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        const selectedFiles = Array.from(
                          event.target.files || [],
                        );

                        appendFilesToGroup(group.id, selectedFiles);
                        event.currentTarget.value = "";
                      }}
                      className={styles.fileInputHidden}
                    />
                    <div className={styles.fileInputContent}>
                      <div className={styles.fileInputIcon}>📷</div>
                      <div className={styles.fileInputMainText}>
                        {group.images.length > 0
                          ? "Add more images to this recipe group"
                          : "Click to add one or more photos for this recipe"}
                      </div>
                      <div className={styles.fileInputSubText}>
                        PNG, JPG, JPEG, GIF, or WEBP up to 1024 KB each
                      </div>
                    </div>
                  </div>
                </label>

                {group.images.length > 0 ? (
                  <div className={recipeStyles.previewBox}>
                    <p className={recipeStyles.previewLabel}>
                      Preview ({group.images.length} image
                      {group.images.length === 1 ? "" : "s"})
                    </p>
                    <div className={styles.previewGrid}>
                      {group.images.map((image, imageIndex) => (
                        <div
                          key={image.id}
                          className={styles.previewImageWrapper}
                        >
                          <Image
                            src={image.previewUrl}
                            alt={`Recipe ${groupIndex + 1} preview ${imageIndex + 1}`}
                            width={200}
                            height={150}
                            className={styles.previewImage}
                          />
                          <div className={styles.previewImageLabel}>
                            {image.file.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(group.id, image.id)}
                            className={styles.previewRemoveButton}
                            aria-label={`Remove ${image.file.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyGroupState}>
                    Add every photo needed to parse this recipe. The batch
                    processor will treat this card as one recipe group.
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className={styles.buttonContainer}>
          <button
            type="button"
            onClick={addGroup}
            disabled={uploadedToS3 || groups.length >= MAX_UPLOAD_RECIPE_GROUPS}
            className={styles.secondaryButton}
          >
            Add Another Recipe Group
          </button>

          <button
            type="button"
            disabled={uploadedToS3}
            onClick={uploadToS3}
            className={`${styles.uploadButton} ${
              uploadedToS3 ? styles.uploadButtonDisabled : ""
            }`}
          >
            {uploadedToS3
              ? `Uploading ${filledGroups.length} recipe group${filledGroups.length === 1 ? "" : "s"}...`
              : `Upload ${filledGroups.length > 0 ? filledGroups.length : ""} Recipe Group${filledGroups.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>

      {error && <p className={recipeStyles.error}>{error}</p>}
    </main>
  );
}
