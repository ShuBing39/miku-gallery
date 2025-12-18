import { supabase } from './supabase'

// 通用上传图片函数
// bucket: 存储桶名称 (如 'user_uploads')
// folder: 文件夹路径 (如 'banners', 'wiki')
// file: 文件对象
export const uploadImage = async (bucket, folder, file) => {
  if (!file) throw new Error('没有选择文件')
  
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  return data.publicUrl
}