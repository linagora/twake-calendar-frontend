import { OpenPaasUserData } from "@/features/User/type/OpenPaasUserData";
import { getResourceDetails, getUserDetails } from "@/features/User/userAPI";

export const fetchOwnerOfResource = async (
  resourceId: string
): Promise<OpenPaasUserData> => {
  try {
    const data = await getResourceDetails(resourceId);
    const ownerData = await getUserDetails(data.creator);
    return {
      ...ownerData,
      administrators: data.administrators,
    };
  } catch (error) {
    console.error(`Failed to fetch resource details for ${resourceId}:`, error);
    throw error;
  }
};

export const fetchOwnerData = async (
  ownerId: string
): Promise<OpenPaasUserData> => {
  try {
    const owner = await getUserDetails(ownerId);
    return owner;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;

    if (status === 404) {
      const owner = await fetchOwnerOfResource(ownerId);
      return {
        ...owner,
        resource: true,
      };
    }

    console.error(`Failed to fetch user details for ${ownerId}:`, error);
    throw error;
  }
};
