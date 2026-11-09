namespace PIMS.Application.Interfaces.Auth;

public interface IPasswordService
{
    string HashPassword(string password);

    bool VerifyPassword(
        string hashedPassword,
        string providedPassword);
}