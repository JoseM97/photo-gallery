import { Injectable } from '@angular/core';

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';

  constructor() { }

/**
 * Method to open the camera and take a photo without save it.
 */
  public async addNewToGallery(){
    //Takes a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri, //Best preformance
      source: CameraSource.Camera, //Take a new photo automatically
      quality: 100 //Determines the quality, (1,100)
    });

    // Saves the picture adding it to photo collection
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);

    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  /**
   * Method to save pictures when photo its taken.
   * It recive 1 param type Photo.
   * @param photo 
   */
  private async savePicture(photo: Photo){
    // Convert photo to based64 format (required by Filesystem API to save)
    const base64Data = await this.readAsBase64(photo);

    // Write the file to the data directory
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    // Use webPath to display the new  image instead of base64 since it's
    // already loaded into memory
    return {
      filepath: fileName,
      webviewPath: photo.webPath,
    };
  }

  public async loadSaved(){
    // Retrieve cached photo array data
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];

    // Display the photo by reading into base64 format
    for (let photo of this.photos){
      // Read each saved photo's data from the Filesystem
      const readFile = await Filesystem.readFile({
        path: photo.filepath,
        directory: Directory.Data,
      });

      // Web platform only: Load the photo as base64 data
      photo.webviewPath = 'data:image/jpeg;base64,${readFile.data}';
    }
  }

  private async readAsBase64(photo: Photo){
    // Fetch the photo, read as a blob,  then convert to base64 format
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();

    return await this.convertBlobToBase64(blob) as string;
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

export interface UserPhoto{
  filepath: string;
  webviewPath?: string;
}