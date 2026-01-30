import { useAuth } from '../contexts/AuthContext';

export const useFeatureFlag = (flag: string) => {
    const { profile } = useAuth();

    if (!profile || !profile.plan_config) {
        return false;
    }

    // Check if the flag exists and is true in the plan_config JSON
    return profile.plan_config[flag] === true;
};
