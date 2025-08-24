// shared-types/index.ts

export interface UserDataPayload {
    request_id: string;
    general: {
        projectName: string;
        businessType: string;
        style: string;
        palette: { primary: string; secondary: string; accent: string; };
    };
    pages: string[];
    structured_data: {
        contact_info: { email: string; phone: string; address: string; };
        services: { };
    };
}