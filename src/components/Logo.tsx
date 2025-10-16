import LogoImage from "../assets/logo.svg";

export default function Logo() {
  return (
    <div className="logo">
      <img src={LogoImage} alt="K8s 镜像列举器" />
      <span className="logo__text">K8s 镜像列举器</span>
    </div>
  );
}

