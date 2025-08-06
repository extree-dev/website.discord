export default interface ImportMetaEnv {
    readonly VITE_DISCORD_CLIENT_ID: string
    readonly VITE_DISCORD_REDIRECT_URI: string
    readonly VITE_DISCORD_SCOPE: string
  }
  
  export default interface ImportMeta {
    readonly env: ImportMetaEnv
  }